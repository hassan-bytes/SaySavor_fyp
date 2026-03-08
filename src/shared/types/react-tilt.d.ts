declare module 'react-tilt' {
    import { Component } from 'react';
    import { HTMLAttributes } from 'react';

    interface TiltOptions {
        reverse?: boolean;
        max?: number;
        perspective?: number;
        scale?: number;
        speed?: number;
        transition?: boolean;
        axis?: 'X' | 'Y' | null;
        reset?: boolean;
        easing?: string;
    }

    interface TiltProps extends HTMLAttributes<HTMLDivElement> {
        options?: TiltOptions;
        style?: React.CSSProperties;
    }

    export class Tilt extends Component<TiltProps> { }
}
