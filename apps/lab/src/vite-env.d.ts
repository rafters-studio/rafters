/// <reference types="vite/client" />

declare module '*.css?inline' {
  const css: string;
  export default css;
}

/** <rafters-button> as a JSX intrinsic (React 19 custom-element support). */
declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      'rafters-button': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          variant?: string;
          size?: string;
          type?: string;
          disabled?: boolean;
          'soft-disabled'?: boolean;
          loading?: boolean;
          toggle?: boolean;
          pressed?: boolean;
          'loading-announcement'?: string;
        },
        HTMLElement
      >;
    }
  }
}
