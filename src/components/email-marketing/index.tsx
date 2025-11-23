'use client'
import { useEmailMarketing } from '@/hooks/email-marketing/use-marketing'
import React, { useEffect, useState } from 'react'
import { CustomerTable } from './customer-table'
import { Button } from '../ui/button'
import { AlertTriangle, Plus } from 'lucide-react'
import Modal from '../mondal'
import { Card, CardContent, CardDescription, CardTitle } from '../ui/card'
import { Loader } from '../loader'
import FormGenerator from '../forms/form-generator'
import { cn, getMonthName } from '@/lib/utils'
import CalIcon from '@/icons/cal-icon'
import PersonIcon from '@/icons/person-icon'
import { EditEmail } from './edit-email'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Checkbox } from '../ui/checkbox'
import { DataTable } from '../table'
import { TableCell, TableRow } from '../ui/table'
import { ScrollArea } from '../ui/scroll-area'

type Props = {
  domains: {
    customer: {
      Domain: {
        name: string
      } | null
      id: string
      email: string | null
    }[]
  }[]
  campaign: {
    name: string
    id: string
    customers: string[]
    createdAt: Date
  }[]
  subscription: {
    plan: 'STANDARD' | 'PRO' | 'ULTIMATE'
    credits: number
  } | null
}

const EmailMarketing = ({ campaign, domains, subscription }: Props) => {
  const {
    onSelectedEmails,
    isSelected,
    onCreateCampaign,
    register,
    errors,
    loading,
    onSelectCampaign,
    processing,
    onAddCustomersToCampaign,
    campaignId,
    onBulkEmail,
    onSetAnswersId,
    isId,
    registerEmail,
    emailErrors,
    onCreateEmailTemplate,
    setValue,
    onDeleteCampaign,
    deleting,
    onBulkSelectEmails,
    campaignMembers,
    onShowCampaignMembers,
    selectedMembers,
    onToggleMemberSelection,
    onToggleAllMembers,
    onRemoveSelectedMembers,
    removingMembers,
    onResetMembersModal,
  } = useEmailMarketing()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)

  useEffect(() => {
    if (!campaignId) {
      setDeleteOpen(false)
    }
  }, [campaignId])

  const onToggleDeleteDialog = (open: boolean) => {
    if (!campaignId && open) return
    setDeleteOpen(open)
  }

  const onConfirmDelete = async () => {
    const result = await onDeleteCampaign()
    if (result?.status === 200) {
      setDeleteOpen(false)
    }
  }

  const membersSelectAll = campaignMembers.length
    ? campaignMembers.every((email) => selectedMembers.includes(email))
    : false
  const membersIndeterminate =
    campaignMembers.length > 0 && !membersSelectAll
      ? campaignMembers.some((email) => selectedMembers.includes(email))
      : false

  const memberHeaders = [
    <Checkbox
      key="members-select-all"
      aria-label="Select all campaign members"
      checked={membersSelectAll ? true : membersIndeterminate ? 'indeterminate' : false}
      disabled={!campaignMembers.length}
      onCheckedChange={(value) =>
        onToggleAllMembers(campaignMembers, value === true)
      }
    />,
    'Email',
  ]

  return (
    <div className="w-full flex-1 h-0 grid grid-cols-1 lg:grid-cols-2 gap-10">
      <CustomerTable
        domains={domains}
        onId={onSetAnswersId}
        onSelect={onSelectedEmails}
        onSelectMany={onBulkSelectEmails}
        select={isSelected}
        id={isId}
      />
      <div>
        <div className="flex gap-3 justify-end">
          <Button
            disabled={isSelected.length == 0}
            onClick={onAddCustomersToCampaign}
          >
            <Plus /> Add to campaign
          </Button>
          <Modal
            title="Create a new campaign"
            description="Add your customers and create a marketing campaign"
            trigger={
              <Card className="flex gap-2 items-center px-3 cursor-pointer text-sm">
                <Loader loading={false}>
                  <Plus /> Create Campaign
                </Loader>
              </Card>
            }
          >
            <form
              className="flex flex-col gap-4"
              onSubmit={onCreateCampaign}
            >
              <FormGenerator
                name="name"
                register={register}
                errors={errors}
                inputType="input"
                placeholder="your campaign name"
                type="text"
              />
              <Button
                className="w-full"
                disabled={loading}
                type="submit"
              >
                <Loader loading={loading}>Create Campaign</Loader>
              </Button>
            </form>
          </Modal>
          <Dialog
            open={deleteOpen}
            onOpenChange={onToggleDeleteDialog}
          >
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                disabled={!campaignId}
              >
                Delete Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Delete this campaign?</DialogTitle>
                <DialogDescription>
                  You are about to permanently remove the selected campaign and its email template configuration.
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex items-center gap-3">
                <span className="rounded-full bg-destructive/20 p-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-destructive">Please confirm you want to proceed.</p>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteOpen(false)}
                >
                  Keep Campaign
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={onConfirmDelete}
                  disabled={deleting}
                >
                  <Loader loading={deleting}>Delete Campaign</Loader>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Card className="p-2">
            <CardDescription className="font-bold">
              {subscription?.credits} credits
            </CardDescription>
          </Card>
        </div>
        <div className="flex flex-col items-end mt-5 gap-3">
          {campaign &&
            campaign.map((camp, i) => (
              <Card
                key={camp.id}
                className={cn(
                  'p-5 min-w-[630px] cursor-pointer',
                  campaignId == camp.id ? 'bg-grey/100 border-[4px]' : ''
                )}
                onClick={() => onSelectCampaign(camp.id)}
              >
                <Loader loading={processing}>
                  <CardContent className="p-0 flex flex-col items-center gap-3">
                    <div className="flex w-full justify-between items-center">
                      <div className="flex gap-2 items-center">
                        <CalIcon />
                        <CardDescription>
                          Created {getMonthName(camp.createdAt.getMonth())}{' '}
                          {camp.createdAt.getDate()}th
                        </CardDescription>
                      </div>
                      <button
                        className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm font-medium transition hover:bg-muted/80"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onShowCampaignMembers(camp.id, camp.customers)
                          setMembersOpen(true)
                        }}
                      >
                        <PersonIcon />
                        <span>{camp.customers.length} customers added</span>
                      </button>
                    </div>
                    <div className="flex w-full justify-between items-center">
                      <CardTitle className="text-xl">{camp.name}</CardTitle>
                      <div className="flex gap-3">
                        <Modal
                          title="Edit Email"
                          description="This email will be sent to campaign members"
                          trigger={
                            <Card
                              className="rounded-lg cursor-pointer bg-orange py-2 px-5 font-bold text-sm hover:bg-grandis text-gray-800"
                              onClick={(event) => {
                                event.stopPropagation()
                              }}
                              onPointerDownCapture={(event) => {
                                event.stopPropagation()
                              }}
                              onMouseDownCapture={(event) => {
                                event.stopPropagation()
                              }}
                            >
                              Edit Email
                            </Card>
                          }
                        >
                          <EditEmail
                            register={registerEmail}
                            errors={emailErrors}
                            setDefault={setValue}
                            id={camp.id}
                            onCreate={onCreateEmailTemplate(camp.id)}
                          />
                        </Modal>
                        <Button
                          variant="default"
                          className="rounded-lg"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            onBulkEmail(
                              campaign[i].customers.map((c) => c),
                              camp.id
                            )
                          }}
                          onPointerDownCapture={(event) => {
                            event.stopPropagation()
                          }}
                          onMouseDownCapture={(event) => {
                            event.stopPropagation()
                          }}
                        >
                          Send
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Loader>
              </Card>
            ))}
        </div>
      </div>
      <Dialog
        open={membersOpen}
        onOpenChange={(open) => {
          setMembersOpen(open)
          if (!open) {
            onResetMembersModal()
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Campaign members</DialogTitle>
            <DialogDescription>
              Review and manage the customers currently assigned to this campaign.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[320px] rounded-lg border border-border bg-muted/30 p-4">
            {campaignMembers.length ? (
              <DataTable headers={memberHeaders}>
                {campaignMembers.map((member) => (
                  <TableRow key={member}>
                    <TableCell>
                      <Checkbox
                        aria-label={`Select ${member}`}
                        checked={selectedMembers.includes(member)}
                        onCheckedChange={() => onToggleMemberSelection(member)}
                      />
                    </TableCell>
                    <TableCell>{member}</TableCell>
                  </TableRow>
                ))}
              </DataTable>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                This campaign does not have any customers yet.
              </div>
            )}
          </ScrollArea>
          <DialogFooter className="mt-4 flex items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              {selectedMembers.length} selected
            </p>
            <Button
              type="button"
              variant="destructive"
              disabled={!selectedMembers.length || removingMembers}
              onClick={onRemoveSelectedMembers}
            >
              <Loader loading={removingMembers}>Remove selected</Loader>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EmailMarketing
