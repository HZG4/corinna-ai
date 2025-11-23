'use client'
import React, { useMemo, useState } from 'react'
import Image from 'next/image'
import { DataTable } from '../table'
import { EMAIL_MARKETING_HEADER } from '@/constants/menu'
import { TableCell, TableRow } from '../ui/table'
import { Card } from '../ui/card'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { SideSheet } from '../sheet'
import Answers from './answers'
import { Input } from '../ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover'
import { ScrollArea } from '../ui/scroll-area'
import { Check, X } from 'lucide-react'
import { Checkbox } from '../ui/checkbox'

type CustomerTableProps = {
  domains: {
    customer: {
      Domain: {
        name: string
      } | null
      id: string
      email: string | null
    }[]
  }[]
  onSelect(email: string): void
  onSelectMany(emails: string[], checked: boolean): void
  select: string[]
  onId(id: string): void
  id?: string
}

export const CustomerTable = ({
  domains,
  onSelect,
  onSelectMany,
  select,
  onId,
  id,
}: CustomerTableProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [domainFilter, setDomainFilter] = useState<string | undefined>()

  const customers = useMemo(
    () =>
      domains.flatMap((domain) =>
        domain.customer.map((c) => ({
          ...c,
          domainName: c.Domain?.name ?? 'Unknown domain',
        }))
      ),
    [domains]
  )

  const domainOptions = useMemo(
    () =>
      Array.from(new Set(customers.map((customer) => customer.domainName))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [customers]
  )

  const filteredCustomers = useMemo(
    () =>
      customers.filter((customer) => {
        const email = customer.email?.toLowerCase() ?? ''
        const matchesSearch = searchTerm
          ? email.includes(searchTerm.toLowerCase())
          : true
        const matchesDomain = domainFilter
          ? customer.domainName === domainFilter
          : true

        return matchesSearch && matchesDomain
      }),
    [customers, searchTerm, domainFilter]
  )

  const onSelectDomain = (value: string) => {
    setDomainFilter((prev) => (prev === value ? undefined : value))
  }

  const onClearFilters = () => {
    setSearchTerm('')
    setDomainFilter(undefined)
  }

  const selectableEmails = useMemo(
    () =>
      filteredCustomers
        .map((customer) => customer.email)
        .filter((email): email is string => Boolean(email)),
    [filteredCustomers]
  )

  const allSelected = selectableEmails.length
    ? selectableEmails.every((email) => select.includes(email))
    : false

  const partiallySelected =
    selectableEmails.length > 0 && !allSelected
      ? selectableEmails.some((email) => select.includes(email))
      : false

  const tableHeaders = EMAIL_MARKETING_HEADER.map((header, index) =>
    index === 0 ? (
      <Checkbox
        key="select-all"
        aria-label="Select all filtered customers"
        checked={allSelected ? true : partiallySelected ? 'indeterminate' : false}
        onCheckedChange={(value) =>
          onSelectMany(selectableEmails, value === true)
        }
        disabled={!selectableEmails.length}
      />
    ) : (
      header
    )
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search emails..."
            className="min-w-[220px]"
          />
        </div>
        <div className="flex items-center gap-2">
          {(searchTerm || domainFilter) && (
            <Button
              type="button"
              variant="destructive"
              className="flex items-center gap-2"
              onClick={onClearFilters}
            >
              <X className="h-4 w-4" /> Clear filters
            </Button>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-10 p-0"
              >
                <Image
                  src="/icons/filter-icon.svg"
                  alt="Filter"
                  width={20}
                  height={20}
                  className="dark:invert dark:brightness-0"
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              collisionPadding={12}
              className="w-60 rounded-xl border border-border bg-popover p-0 shadow-lg"
              align="end"
            >
              <div className="border-b border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Choose a domain to focus the table results.
                </p>
              </div>
              <ScrollArea className="max-h-64">
                <div className="flex flex-col">
                  {domainOptions.map((option) => {
                    const active = domainFilter === option
                    return (
                      <button
                        key={option}
                        type="button"
                        className={cn(
                          'flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-muted/70',
                          active && 'bg-muted'
                        )}
                        onClick={() => onSelectDomain(option)}
                      >
                        <span>{option}</span>
                        {active && <Check className="h-4 w-4" />}
                      </button>
                    )
                  })}
                  {!domainOptions.length && (
                    <p className="px-4 py-3 text-sm text-muted-foreground">
                      No domains available.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <DataTable headers={tableHeaders}>
        {filteredCustomers.length ? (
          filteredCustomers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell>
                <Checkbox
                  aria-label={`Select ${customer.email ?? 'customer'}`}
                  checked={customer.email ? select.includes(customer.email) : false}
                  onCheckedChange={() =>
                    customer.email && onSelect(customer.email)
                  }
                  disabled={!customer.email}
                />
              </TableCell>
              <TableCell>{customer.email || 'Unknown email'}</TableCell>
              <TableCell>
                <SideSheet
                  title="Answers"
                  description="Customer answers are stored by the bot when your customers respond back to the questions asked by the bot."
                  trigger={
                    <Card
                      className="bg-orange py-2 px-4 cursor-pointer text-gray-800 font-bold hover:bg-grandis"
                      onClick={() => onId(customer.id)}
                    >
                      View
                    </Card>
                  }
                >
                  <Answers id={id} />
                </SideSheet>
              </TableCell>
              <TableCell className="text-right">
                {customer.domainName}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={EMAIL_MARKETING_HEADER.length}
              className="py-10 text-center text-muted-foreground"
            >
              No customers match the current filters.
            </TableCell>
          </TableRow>
        )}
      </DataTable>
    </div>
  )
}
