import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/misc';
import { Subtitle } from './subtitle';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

const alertVariants = cva(
  'relative w-full rounded-xl px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7',
  {
    variants: {
      variant: {
        default: 'text-foreground',
        destructive:
          'border border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };

export function CodeHashCallout({ codeHash }: { codeHash: string }) {
  return (
    <Alert>
      <div className="flex items-center gap-2">
        <div className="relative group">
          <AlertTitle>
            <div className="flex flex-row items-center gap-1">
              <Subtitle title="Expected Code Hash" />
              <InformationCircleIcon className="w-4 h-4 text-gray-400" />
            </div>
          </AlertTitle>
          <div className="absolute left-0 z-50 invisible p-2 text-sm text-white bg-gray-800 rounded-lg w-72 group-hover:visible -top-12">
            This code hash represents the exact code running in the secure
            enclave
          </div>
        </div>
      </div>
      <AlertDescription>
        <div className="overflow-x-auto">
          <code className="relative font-mono text-xs">{codeHash}</code>
        </div>
      </AlertDescription>
    </Alert>
  );
}
