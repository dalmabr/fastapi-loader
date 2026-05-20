declare module '@/components/ui/button' {
  export const Button: React.FC<any>;
}

declare module '@/components/ui/badge' {
  export const Badge: React.FC<any>;
}

declare module '@/components/ui/input' {
  export const Input: React.FC<any>;
}

declare module '@/components/ui/label' {
  export const Label: React.FC<any>;
}

declare module '@/components/ui/dialog' {
  export const Dialog: React.FC<any>;
  export const DialogContent: React.FC<any>;
  export const DialogDescription: React.FC<any>;
  export const DialogFooter: React.FC<any>;
  export const DialogHeader: React.FC<any>;
  export const DialogTitle: React.FC<any>;
}

declare module '@/components/ui/card' {
  import * as React from 'react';
  
  export const Card: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>
  >;
  
  export const CardHeader: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>
  >;
  
  export const CardTitle: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLHeadingElement> & React.RefAttributes<HTMLHeadingElement>
  >;
  
  export const CardDescription: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLParagraphElement> & React.RefAttributes<HTMLParagraphElement>
  >;
  
  export const CardContent: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>
  >;
  
  export const CardFooter: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>
  >;
}