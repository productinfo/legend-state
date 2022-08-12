import { ObservableListenerDispose } from '@legendapp/state';
import { FC, forwardRef, memo, useEffect, useRef } from 'react';
import { listenWhileCalling } from './listenWhileCalling';
import { useForceRender } from './useForceRender';

const hasSymbol = typeof Symbol === 'function' && Symbol.for;

// Extracting the forwardRef inspired by https://github.com/mobxjs/mobx/blob/main/packages/mobx-react-lite/src/observer.ts
const ReactForwardRefSymbol = hasSymbol
    ? Symbol.for('react.forward_ref')
    : typeof forwardRef === 'function' && forwardRef((props: any) => null)['$$typeof'];

export function observer(component: FC) {
    // Unwrap forwardRef on the component
    let useForwardRef: boolean;
    if (ReactForwardRefSymbol && component['$$typeof'] === ReactForwardRefSymbol) {
        useForwardRef = true;
        component = component['render'];
        if (process.env.NODE_ENV === 'development' && typeof component !== 'function') {
            throw new Error(`[legend-state] \`render\` property of ForwardRef was not a function`);
        }
    }

    // Create a wrapper observer component
    let out = function (props) {
        const ref = useRef<Set<ObservableListenerDispose>>();
        if (!ref.current) ref.current = new Set();

        const forceRender = useForceRender();

        // Clean up listeners on the way out
        useEffect(() => () => ref.current.forEach((dispose) => dispose()), []);

        // Set up all the listeners while rendering the component
        return listenWhileCalling(() => component(props), ref.current, forceRender);
    };

    // Wrap back in forwardRef if necessary
    if (useForwardRef) {
        out = forwardRef(out);
    }

    return memo(out);
}
