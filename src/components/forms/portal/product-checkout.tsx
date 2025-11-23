'use client'
import React from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { useStripeCustomer } from '@/hooks/billing/use-billing'
import { Loader } from '@/components/loader'
import { Card } from '@/components/ui/card'
import { Elements } from '@stripe/react-stripe-js'
import Image from 'next/image'
import { CustomerPaymentForm } from './payment-form'
import { Button } from '@/components/ui/button'

type Props = {
  onBack(): void
  products?:
    | {
        name: string
        image: string
        price: number
      }[]
    | undefined
  amount?: number
  onNext(): void
  stripeId?: string
}

const PaymentCheckout = ({
  onBack,
  onNext,
  amount,
  products,
  stripeId,
}: Props) => {
  const StripePromise = loadStripe(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISH_KEY!,
    {
      stripeAccount: stripeId!,
    }
  )
  const { stripeSecret, loadForm } = useStripeCustomer(amount!, stripeId!)
  const formattedAmount = amount
    ? amount.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      })
    : '$0.00'

  return (
    <Loader loading={loadForm}>
      <div className="flex w-full justify-center">
        <div className="w-full max-w-5xl space-y-8 rounded-2xl border bg-background/70 p-6 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-2 text-center lg:text-left">
            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              Secure Checkout
            </span>
            <div className="flex flex-col gap-1 lg:flex-row lg:items-end lg:justify-between">
              <h2 className="text-3xl font-bold tracking-tight">Payment Details</h2>
              <p className="text-sm text-muted-foreground">
                Powered by Stripe
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-6">
              <div className="rounded-xl border bg-muted/30 p-5">
                <p className="text-sm font-medium text-muted-foreground">
                  Amount due
                </p>
                <p className="mt-2 text-3xl font-semibold text-primary">
                  {formattedAmount}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Order summary</h3>
                {products?.length ? (
                  <span className="text-sm text-muted-foreground">
                    {products.length} item{products.length > 1 ? 's' : ''}
                  </span>
                ) : null}
              </div>

              <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                {products?.length ? (
                  products.map((product, index) => (
                    <Card
                      key={`${product.name}-${index}`}
                      className="flex items-center gap-4 rounded-xl border bg-card/80 p-4 shadow-sm"
                    >
                      <div className="relative h-16 w-16 overflow-hidden rounded-lg">
                        <Image
                          src={`https://ucarecdn.com/${product.image}/`}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex flex-1 items-center justify-between gap-4">
                        <div>
                          <p className="text-base font-semibold">
                            {product.name}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-primary">
                          ${product.price}
                        </p>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                    No products added to this checkout.
                  </Card>
                )}
              </div>

              <div className="flex justify-start">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onBack}
                  className="px-4"
                >
                  Back
                </Button>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-md">
              {stripeSecret && StripePromise && (
                <Elements
                  stripe={StripePromise}
                  options={{
                    clientSecret: stripeSecret,
                    appearance: {
                      theme: 'stripe',
                    },
                  }}
                >
                  <CustomerPaymentForm onNext={onNext} />
                </Elements>
              )}
            </div>
          </div>
        </div>
      </div>
    </Loader>
  )
}

export default PaymentCheckout
