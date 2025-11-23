import {
  onAddCustomersToEmail,
  onBulkMailer,
  onCreateMarketingCampaign,
  onGetAllCustomerResponses,
  onDeleteCampaign,
  onGetEmailTemplate,
  onSaveEmailTemplate,
} from '@/actions/mail'
import { useToast } from '@/components/ui/use-toast'
import {
  EmailMarketingBodySchema,
  EmailMarketingSchema,
} from '@/schemas/marketing.schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

export const useEmailMarketing = () => {
  const [isSelected, setIsSelected] = useState<string[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [campaignId, setCampaignId] = useState<string | undefined>()
  const [processing, setProcessing] = useState<boolean>(false)
  const [isId, setIsId] = useState<string | undefined>(undefined)
  const [editing, setEditing] = useState<boolean>(false)
  const [deleting, setDeleting] = useState<boolean>(false)
  const [campaignMembers, setCampaignMembers] = useState<string[]>([])
  const [membersCampaignId, setMembersCampaignId] = useState<string | undefined>()
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [removingMembers, setRemovingMembers] = useState<boolean>(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(EmailMarketingSchema),
  })

  const {
    register: registerEmail,
    formState: { errors: emailErrors },
    handleSubmit: SubmitEmail,
    setValue,
  } = useForm({
    resolver: zodResolver(EmailMarketingBodySchema),
  })
  const { toast } = useToast()
  const router = useRouter()

  const onCreateCampaign = handleSubmit(async (values) => {
    try {
      setLoading(true)
      const campaign = await onCreateMarketingCampaign(values.name)
      if (campaign) {
        reset()
        toast({
          title: 'Success',
          description: campaign.message,
        })
        setLoading(false)
        router.refresh()
      }
    } catch (error) {
      console.log(error)
    }
  })

  const onCreateEmailTemplate = (targetCampaignId: string) =>
    SubmitEmail(async (values) => {
      try {
        if (!targetCampaignId) {
          toast({
            title: 'Something went wrong',
            description: 'Unable to determine which campaign to update.',
          })
          return
        }
        setEditing(true)
        const template = JSON.stringify(values.description)
        const emailTemplate = await onSaveEmailTemplate(
          template,
          targetCampaignId
        )
        if (emailTemplate) {
          toast({
            title: 'Success',
            description: emailTemplate.message,
          })
        }
      } catch (error) {
        console.log(error)
      } finally {
        setEditing(false)
      }
    })

  const onSelectCampaign = (id: string) =>
    setCampaignId((prev) => (prev === id ? undefined : id))

  const onAddCustomersToCampaign = async () => {
    try {
      setProcessing(true)
      const customersAdd = await onAddCustomersToEmail(isSelected, campaignId!)
      if (customersAdd) {
        toast({
          title: 'Success',
          description: customersAdd.message,
        })
        setProcessing(false)
        setCampaignId(undefined)
        setCampaignMembers([])
        setMembersCampaignId(undefined)
        router.refresh()
      }
    } catch (error) {
      console.log(error)
    }
  }

  const onSelectedEmails = (email: string) => {
    //add or remove
    const duplicate = isSelected.find((e) => e == email)
    if (duplicate) {
      setIsSelected(isSelected.filter((e) => e !== email))
    } else {
      setIsSelected((prev) => [...prev, email])
    }
  }

  const onBulkSelectEmails = (emails: string[], checked: boolean) => {
    if (!emails.length) return
    setIsSelected((prev) => {
      if (checked) {
        const merged = new Set([...prev, ...emails])
        return Array.from(merged)
      }
      return prev.filter((email) => !emails.includes(email))
    })
  }

  const onBulkEmail = async (emails: string[], campaignId: string) => {
    try {
      const mails = await onBulkMailer(emails, campaignId)
      if (mails) {
        toast({
          title: 'Success',
          description: mails.message,
        })
        router.refresh()
      }
    } catch (error) {
      console.log(error)
    }
  }

  const onSetAnswersId = (id: string) => setIsId(id)

  const onShowCampaignMembers = (id: string, members: string[]) => {
    setMembersCampaignId(id)
    setCampaignMembers(members)
    setSelectedMembers([])
  }

  const onToggleMemberSelection = (email: string) => {
    setSelectedMembers((prev) =>
      prev.includes(email) ? prev.filter((item) => item !== email) : [...prev, email]
    )
  }

  const onToggleAllMembers = (emails: string[], checked: boolean) => {
    if (!emails.length) return
    setSelectedMembers((prev) => {
      if (checked) {
        const merged = new Set([...prev, ...emails])
        return Array.from(merged)
      }
      return prev.filter((email) => !emails.includes(email))
    })
  }

  const onRemoveSelectedMembers = async () => {
    if (!membersCampaignId || !selectedMembers.length) return
    try {
      setRemovingMembers(true)
      const updatedMembers = campaignMembers.filter(
        (member) => !selectedMembers.includes(member)
      )
      const response = await onAddCustomersToEmail(
        updatedMembers,
        membersCampaignId
      )
      if (response) {
        toast({
          title: 'Members removed',
          description: 'Selected customers were removed from the campaign.',
        })
        setCampaignMembers(updatedMembers)
        setSelectedMembers([])
        router.refresh()
      }
    } catch (error) {
      console.log(error)
    } finally {
      setRemovingMembers(false)
    }
  }

  const onResetMembersModal = () => {
    setCampaignMembers([])
    setMembersCampaignId(undefined)
    setSelectedMembers([])
  }

  const onDeleteSelectedCampaign = async () => {
    if (!campaignId) return
    try {
      setDeleting(true)
      const deleted = await onDeleteCampaign(campaignId)
      if (deleted) {
        toast({
          title: 'Success',
          description: deleted.message,
        })
        setCampaignId(undefined)
        setCampaignMembers([])
        setMembersCampaignId(undefined)
        setSelectedMembers([])
        router.refresh()
      }
      return deleted
    } catch (error) {
      console.log(error)
    } finally {
      setDeleting(false)
    }
  }

  return {
    onSelectedEmails,
    isSelected,
    onCreateCampaign,
    register,
    errors,
    loading,
    onSelectCampaign,
    processing,
    campaignId,
    onAddCustomersToCampaign,
    onBulkEmail,
    onSetAnswersId,
    isId,
    registerEmail,
    emailErrors,
    onCreateEmailTemplate,
    editing,
    setValue,
    onDeleteCampaign: onDeleteSelectedCampaign,
    deleting,
    onBulkSelectEmails,
    campaignMembers,
    setCampaignMembers,
    onShowCampaignMembers,
    selectedMembers,
    onToggleMemberSelection,
    onToggleAllMembers,
    onRemoveSelectedMembers,
    removingMembers,
    membersCampaignId,
    onResetMembersModal,
  }
}

export const useAnswers = (id: string) => {
  const [answers, setAnswers] = useState<
    {
      customer: {
        questions: { question: string; answered: string | null }[]
      }[]
    }[]
  >([])
  const [loading, setLoading] = useState<boolean>(false)

  const onGetCustomerAnswers = async () => {
    try {
      setLoading(true)
      const answer = await onGetAllCustomerResponses(id)
      setLoading(false)
      if (answer) {
        setAnswers(answer)
      }
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    onGetCustomerAnswers()
  }, [])

  return { answers, loading }
}

export const useEditEmail = (id: string) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [template, setTemplate] = useState<string>('')

  const onGetTemplate = async (id: string) => {
    try {
      setLoading(true)
      const email = await onGetEmailTemplate(id)
      if (email) {
        setTemplate(email)
      }
      setLoading(false)
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    onGetTemplate(id)
  }, [])

  return { loading, template }
}
