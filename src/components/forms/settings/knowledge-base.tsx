'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import Section from '@/components/section-label'
import FormGenerator from '../form-generator'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/loader'
import Accordion from '@/components/accordian'
import { useKnowledgeBase } from '@/hooks/settings/use-settings'

type Props = {
  id: string
}

const KnowledgeBase = ({ id }: Props) => {
  const { register, errors, loading, entries, onAddKnowledgeBaseEntry } =
    useKnowledgeBase(id)

  return (
    <Card className="w-full grid grid-cols-1 lg:grid-cols-2">
      <CardContent className="p-6 border-r-[1px]">
        <CardTitle>Knowledge Base</CardTitle>
        <form
          onSubmit={onAddKnowledgeBaseEntry}
          className="mt-10 flex flex-col gap-6"
        >
          <div className="flex flex-col gap-3">
            <Section
              label="Title"
              message="Give your entry a short descriptive title."
            />
            <FormGenerator
              inputType="input"
              register={register}
              errors={errors}
              name="title"
              placeholder="e.g. Refund policy overview"
              type="text"
              form="knowledge-base-form"
            />
          </div>
          <div className="flex flex-col gap-3">
            <Section
              label="Content"
              message="Add the detailed information your chatbot should reference."
            />
            <FormGenerator
              inputType="textarea"
              register={register}
              errors={errors}
              name="content"
              placeholder="Write the knowledge article"
              type="text"
              lines={8}
              form="knowledge-base-form"
            />
          </div>
          <Button
            type="submit"
            className="bg-orange text-white font-semibold transition duration-150 ease-in-out hover:bg-orange hover:opacity-70"
            disabled={loading}
          >
            <Loader loading={loading}>Save entry</Loader>
          </Button>
        </form>
      </CardContent>
      <CardContent className="chat-window overflow-y-auto p-6">
        <Loader loading={loading}>
          {entries.length ? (
            entries.map((entry) => {
              const updatedOn = new Date(entry.updatedAt).toLocaleDateString(
                'en-US',
                {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }
              )

              return (
                <Accordion
                  key={entry.id}
                  trigger={
                    <div className="flex flex-col text-left">
                      <span className="font-semibold">{entry.title}</span>
                      <span className="text-xs text-muted-foreground">
                        Updated {updatedOn}
                      </span>
                    </div>
                  }
                  content={
                    <p className="whitespace-pre-line text-sm text-muted-foreground">
                      {entry.content}
                    </p>
                  }
                />
              )
            })
          ) : (
            <CardDescription>No knowledge base entries yet.</CardDescription>
          )}
        </Loader>
      </CardContent>
    </Card>
  )
}

export default KnowledgeBase
