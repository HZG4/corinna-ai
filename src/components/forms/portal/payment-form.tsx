'use client'
import { Loader } from '@/components/loader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useCompleteCustomerPayment } from '@/hooks/billing/use-billing'
import { PaymentElement } from '@stripe/react-stripe-js'
import React from 'react'

type CustomerPaymentFormProps = {
  onNext(): void
}

export const CustomerPaymentForm = ({ onNext }: CustomerPaymentFormProps) => {
  const { processing, onMakePayment } = useCompleteCustomerPayment(onNext)
  return (
    <div className="space-y-6">
      <Card className="border bg-muted/10 p-6 shadow-sm">
        <PaymentElement
          options={{
            layout: {
              type: 'tabs',
            },
          }}
        />
      </Card>
      <Button
        type="submit"
        className="h-11 w-full"
        onClick={onMakePayment}
        disabled={processing}
      >
        <Loader loading={processing}>Pay</Loader>
      </Button>
    </div>
  )
}
