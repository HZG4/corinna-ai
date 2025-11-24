'use server'

import { client } from '@/lib/prisma'
import { extractEmailsFromString, extractURLfromString } from '@/lib/utils'
import { onRealTimeChat } from '../conversation'
import { clerkClient } from '@clerk/nextjs'
import { onMailer } from '../mailer'
import OpenAi from 'openai'

const openai = new OpenAi({
  apiKey: process.env.OPEN_AI_KEY,
})

export const onStoreConversations = async (
  id: string,
  message: string | null | undefined,
  role: 'assistant' | 'user'
) => {
  if (!message || message.trim().length === 0) {
    return
  }

  await client.chatRoom.update({
    where: {
      id,
    },
    data: {
      message: {
        create: {
          message,
          role,
        },
      },
    },
  })
}

export const onGetCurrentChatBot = async (id: string) => {
  try {
    const chatbot = await client.domain.findUnique({
      where: {
        id,
      },
      select: {
        helpdesk: true,
        name: true,
        chatBot: {
          select: {
            id: true,
            welcomeMessage: true,
            icon: true,
            textColor: true,
            background: true,
            helpdesk: true,
          },
        },
      },
    })

    if (chatbot) {
      return chatbot
    }
  } catch (error) {
    console.log(error)
  }
}

let customerEmail: string | undefined

export const onAiChatBotAssistant = async (
  id: string,
  chat: { role: 'assistant' | 'user'; content: string }[],
  author: 'user',
  message: string
) => {
  try {
    const chatBotDomain = await client.domain.findUnique({
      where: {
        id,
      },
      select: {
        name: true,
        filterQuestions: {
          where: {
            answered: null,
          },
          select: {
            question: true,
          },
        },
        knowledgeBase: {
          select: {
            title: true,
            content: true,
          },
        },
      },
    })
    if (chatBotDomain) {
      const extractedEmail = extractEmailsFromString(message)
      if (extractedEmail) {
        customerEmail = extractedEmail[0]
      }

      if (customerEmail) {
        const checkCustomer = await client.domain.findUnique({
          where: {
            id,
          },
          select: {
            User: {
              select: {
                clerkId: true,
              },
            },
            name: true,
            customer: {
              where: {
                email: {
                  startsWith: customerEmail,
                },
              },
              select: {
                id: true,
                email: true,
                questions: true,
                chatRoom: {
                  select: {
                    id: true,
                    live: true,
                    mailed: true,
                  },
                },
              },
            },
          },
        })
        if (checkCustomer && !checkCustomer.customer.length) {
          const newCustomer = await client.domain.update({
            where: {
              id,
            },
            data: {
              customer: {
                create: {
                  email: customerEmail,
                  questions: {
                    create: chatBotDomain.filterQuestions,
                  },
                  chatRoom: {
                    create: {},
                  },
                },
              },
            },
          })
          if (newCustomer) {
            console.log('new customer made')
            const response = {
              role: 'assistant',
              content: `Welcome aboard ${
                customerEmail.split('@')[0]
              }! I'm glad to connect with you. Is there anything you need help with?`,
            }
            return { response }
          }
        }
        if (checkCustomer && checkCustomer.customer[0].chatRoom[0].live) {
          await onStoreConversations(
            checkCustomer?.customer[0].chatRoom[0].id!,
            message,
            author
          )
          
          onRealTimeChat(
            checkCustomer.customer[0].chatRoom[0].id,
            message,
            'user',
            author
          )

          if (!checkCustomer.customer[0].chatRoom[0].mailed) {
            const user = await clerkClient.users.getUser(
              checkCustomer.User?.clerkId!
            )

            onMailer(user.emailAddresses[0].emailAddress)

            //update mail status to prevent spamming
            const mailed = await client.chatRoom.update({
              where: {
                id: checkCustomer.customer[0].chatRoom[0].id,
              },
              data: {
                mailed: true,
              },
            })

            if (mailed) {
              return {
                live: true,
                chatRoom: checkCustomer.customer[0].chatRoom[0].id,
              }
            }
          }
          return {
            live: true,
            chatRoom: checkCustomer.customer[0].chatRoom[0].id,
          }
        }

        await onStoreConversations(
          checkCustomer?.customer[0].chatRoom[0].id!,
          message,
          author
        )

        // ============================================================
        // SCENARIO 1: CUSTOMER EMAIL IS KNOWN
        // GOAL: Filter, Book Immediately if interested, or Switch to Realtime
        // ============================================================
        const knowledgeBaseContext = chatBotDomain.knowledgeBase
          ?.map(
            (entry) =>
              `Title: ${entry.title}\nSummary: ${entry.content}`
          )
          .join('\n---\n')
        const hasKnowledgeBase = Boolean(knowledgeBaseContext?.trim())

        const chatCompletion = await openai.chat.completions.create({
          messages: [
            {
              role: 'assistant',
              content: `
              You are a helpful assistant for ${chatBotDomain.name}.
              Your goal is to book an appointment or collect information using the provided questions.

              STRICT INSTRUCTIONS:

              0. **KNOWLEDGE BASE PRIORITY**:
                 - You are provided with the following knowledge base entries:
                   ${hasKnowledgeBase ? knowledgeBaseContext : 'No saved entries yet.'}
                 - Always check whether a user's question can be answered with the knowledge base before doing anything else.
                 - If a knowledge entry answers the question, respond directly using that information and do NOT switch to realtime unless the user explicitly rejects the answer or asks for a human.
                 - When you rely on a knowledge entry, reference it naturally.

              1. **IMMEDIATE BOOKING**: 
                 - Analyze the customer's sentiment. 
                 - IF the customer expresses a desire to book appointment, shows high interest, says "yes":
                 - IGNORE the remaining questions.
                 - IMMEDIATELY output the appointment link: ${process.env.NEXT_PUBLIC_DOMAIN}/portal/${id}/appointment/${checkCustomer?.customer[0].id}
                 - OR if payment is required: ${process.env.NEXT_PUBLIC_DOMAIN}/portal/${id}/payment/${checkCustomer?.customer[0].id}

              2. **REALTIME HANDOFF**:
            - Switch to realtime when you cannot answer using the knowledge base, the user explicitly asks for a human, or the user remains frustrated after a knowledge-base response.
            - When escalating, you must include the exact keyword (realtime). Ideally return only "(realtime)" or a brief handoff sentence that ends with the keyword.
            - Do NOT escalate to realtime if the knowledge base contains the requested information.

              3. **INFORMATION COLLECTION (Default)**:
                 - If the user is just answering prompts normally, proceed with the list of questions.
                 - Questions to ask: [${chatBotDomain.filterQuestions
                .map((questions) => questions.question)
                .join(', ')}]
                 - Ask ONE question at a time.
                 - When asking a question from this list, you MUST append the keyword (complete) at the end.
                 - Do NOT append (complete) if you are providing the booking link or handing off to (realtime).

              Maintain a professional and helpful tone.
          `,
            },
            ...chat,
            {
              role: 'user',
              content: message,
            },
          ],
          model: 'gpt-3.5-turbo',
        })

        if (chatCompletion.choices[0].message.content?.includes('(realtime)')) {
          const realtime = await client.chatRoom.update({
            where: {
              id: checkCustomer?.customer[0].chatRoom[0].id,
            },
            data: {
              live: true,
            },
          })

          if (realtime) {
            const response = {
              role: 'assistant',
              content: chatCompletion.choices[0].message.content.replace(
                '(realtime)',
                ''
              ),
            }

            await onStoreConversations(
              checkCustomer?.customer[0].chatRoom[0].id!,
              response.content,
              'assistant'
            )

            return {
              live: true,
              chatRoom: checkCustomer?.customer[0].chatRoom[0].id,
              response,
            }
          }
        }
        if (chat[chat.length - 1].content.includes('(complete)')) {
          const firstUnansweredQuestion =
            await client.customerResponses.findFirst({
              where: {
                customerId: checkCustomer?.customer[0].id,
                answered: null,
              },
              select: {
                id: true,
              },
              orderBy: {
                question: 'asc',
              },
            })
          if (firstUnansweredQuestion) {
            await client.customerResponses.update({
              where: {
                id: firstUnansweredQuestion.id,
              },
              data: {
                answered: message,
              },
            })
          }
        }

        if (chatCompletion) {
          const generatedLink = extractURLfromString(
            chatCompletion.choices[0].message.content as string
          )

          if (generatedLink) {
            const link = generatedLink[0]
            const sanitizedLink = link.replace(/[)\]\.,]+$/, '')
            const response = {
              role: 'assistant',
              content: `Great! you can follow the link to proceed`,
              link: sanitizedLink,
            }

            await onStoreConversations(
              checkCustomer?.customer[0].chatRoom[0].id!,
              `${response.content} ${response.link}`,
              'assistant'
            )

            return { response }
          }

          const response = {
            role: 'assistant',
            content: chatCompletion.choices[0].message.content,
          }

          await onStoreConversations(
            checkCustomer?.customer[0].chatRoom[0].id!,
            `${response.content}`,
            'assistant'
          )

          return { response }
        }
      }
      
      console.log('No customer')
      
      // ============================================================
      // SCENARIO 2: NO CUSTOMER EMAIL YET
      // GOAL: Gatekeeping. Must get email. No Realtime switch allowed.
      // ============================================================
      const chatCompletion = await openai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: `
            You are a sales representative for ${chatBotDomain.name}.
            
            YOUR PRIORITY: You must obtain the customer's email address to proceed.
            
            RULES:
            1. **GATEKEEPING**: The user cannot book an appointment or ask specific questions until they provide their email.
            2. **OFF-TOPIC HANDLING**: If the user asks questions unrelated to providing their email (e.g., "what is the price?", "where are you located?"):
               - Do NOT answer the question.
               - Politely inform them that you need their email address to access their file or assist them further.
               - Redirect the conversation back to the email request.
            3. **PERSISTENCE**: Be polite but firm. Do not let the user bypass the email step.
            
            Start by welcoming them and asking for their email to get started.
          `,
          },
          ...chat,
          {
            role: 'user',
            content: message,
          },
        ],
        model: 'gpt-3.5-turbo',
      })

      if (chatCompletion) {
        const response = {
          role: 'assistant',
          content: chatCompletion.choices[0].message.content,
        }

        return { response }
      }
    }
  } catch (error) {
    console.log(error)
  }
}