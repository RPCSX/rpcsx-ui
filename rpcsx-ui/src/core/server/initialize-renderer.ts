import * as bridge from 'lib/bridge';
import * as instance from './ComponentInstance'
import { createError } from 'lib/Error';
import { ErrorCode } from '$/enums';

export function initializeRenderer() {
    const rendererComponent = instance.registerComponent({
        name: ":renderer",
        version: "0.1.0"
    }, {
        initialize: () => { },
        activate: () => { },
        deactivate: () => { },
        dispose: () => { }
    });


    bridge.setOnEvent((event, handler) => {
        const [componentName, ...path] = event.split("/");

        const component = instance.findComponent(componentName);

        if (!component) {
            throw createError(ErrorCode.InvalidParams, `component ${component} not found`);
        }

        const disposable = component.onEvent(rendererComponent, path.join("/"), handler);
        return () => disposable.dispose();
    });

    bridge.setOnInvoke((method, params) => {
        const [componentName, ...path] = method.split("/");

        const component = instance.findComponent(componentName);

        if (!component) {
            throw createError(ErrorCode.InvalidParams, `component ${component} not found`);
        }

        return component.notify(rendererComponent, path.join("/"), params);
    });

    bridge.setOnCall((method, params) => {
        const [componentName, ...path] = method.split("/");

        const component = instance.findComponent(componentName);

        if (!component) {
            throw createError(ErrorCode.InvalidParams, `component ${component} not found`);
        }

        return component.call(rendererComponent, path.join("/"), params);
    });
}
