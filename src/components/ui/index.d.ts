declare module '@/components/ui/button' {
  import * as React from 'react';
  import { ButtonHTMLAttributes } from 'react';
  
  export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    asChild?: boolean;
  }
  
  export const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;
}

declare module '@/components/ui/input' {
  import * as React from 'react';
  import { InputHTMLAttributes } from 'react';
  
  export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}
  export const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>>;
}

declare module '@/components/ui/label' {
  import * as React from 'react';
  import { LabelHTMLAttributes } from 'react';
  
  export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}
  export const Label: React.ForwardRefExoticComponent<LabelProps & React.RefAttributes<HTMLLabelElement>>;
}

declare module '@/components/ui/dialog' {
  import * as React from 'react';
  
  export const Dialog: React.FC<{
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children?: React.ReactNode;
  }>;
  
  export const DialogTrigger: React.FC<{ asChild?: boolean; children?: React.ReactNode }>;
  export const DialogPortal: React.FC<{ children?: React.ReactNode }>;
  export const DialogClose: React.FC<{ asChild?: boolean; children?: React.ReactNode }>;
  
  export const DialogOverlay: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>
  >;
  
  export const DialogContent: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLDivElement> & {
      onPointerDownOutside?: (event: any) => void;
      onInteractOutside?: (event: any) => void;
    } & React.RefAttributes<HTMLDivElement>
  >;
  
  export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  
  export const DialogTitle: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLHeadingElement> & React.RefAttributes<HTMLHeadingElement>
  >;
  
  export const DialogDescription: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLParagraphElement> & React.RefAttributes<HTMLParagraphElement>
  >;
}