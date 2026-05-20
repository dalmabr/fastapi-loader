/// <reference types="vite/client" />

declare module '*.jsx' {
  import * as React from 'react';
  const component: any;
  export default component;
}