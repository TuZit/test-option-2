import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Card = forwardRef(function Card({ className, ...props }, ref) {
  return <div ref={ref} className={cn('ui-card', className)} {...props} />
})

const CardHeader = forwardRef(function CardHeader({ className, ...props }, ref) {
  return <div ref={ref} className={cn('ui-card__header', className)} {...props} />
})

const CardTitle = forwardRef(function CardTitle({ className, as: Tag = 'h2', ...props }, ref) {
  return <Tag ref={ref} className={cn('ui-card__title', className)} {...props} />
})

const CardDescription = forwardRef(function CardDescription({ className, ...props }, ref) {
  return <p ref={ref} className={cn('ui-card__description', className)} {...props} />
})

const CardContent = forwardRef(function CardContent({ className, ...props }, ref) {
  return <div ref={ref} className={cn('ui-card__content', className)} {...props} />
})

const CardFooter = forwardRef(function CardFooter({ className, ...props }, ref) {
  return <div ref={ref} className={cn('ui-card__footer', className)} {...props} />
})

Card.displayName = 'Card'
CardHeader.displayName = 'CardHeader'
CardTitle.displayName = 'CardTitle'
CardDescription.displayName = 'CardDescription'
CardContent.displayName = 'CardContent'
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
