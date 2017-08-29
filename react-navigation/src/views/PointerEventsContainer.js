/* @flow */

import React from 'react';

import invariant from 'fbjs/lib/invariant';

import AnimatedValueSubscription from './AnimatedValueSubscription';

import type { NavigationSceneRendererProps } from '../TypeDefinition';

type Props = NavigationSceneRendererProps;

const MIN_POSITION_OFFSET = 0.01;

/**
 * Create a higher-order component that automatically computes the
 * `pointerEvents` property for a component whenever navigation position
 * changes.
 */
export default function create(Component: ReactClass<*>): ReactClass<*> {
  class Container extends React.Component<any, Props, any> {
    _component: any;
    _onComponentRef: (view: any) => void;
    _onPositionChange: (data: { value: number }) => void;
    _pointerEvents: string;
    _positionListener: ?AnimatedValueSubscription;

    props: Props;

    constructor(props: Props, context: any) {
      super(props, context);
      this._pointerEvents = this._computePointerEvents();
    }

    componentWillMount(): void {
      this._onPositionChange = this._onPositionChange.bind(this);
      this._onComponentRef = this._onComponentRef.bind(this);
    }

    componentDidMount(): void {
      this._bindPosition(this.props);
    }

    componentWillUnmount(): void {
      this._positionListener && this._positionListener.remove();
    }

    componentWillReceiveProps(nextProps: Props): void {
      this._bindPosition(nextProps);
    }

    render() {
      this._pointerEvents = this._computePointerEvents();
      return (
        <Component
          {...this.props}
          pointerEvents={this._pointerEvents}
          onComponentRef={this._onComponentRef}
        />
      );
    }

    _onComponentRef(component: any): void {
      this._component = component;
      if (component) {
        invariant(
          typeof component.setNativeProps === 'function',
          'component must implement method `setNativeProps`',
        );
      }
    }

    _bindPosition(props: NavigationSceneRendererProps): void {
      this._positionListener && this._positionListener.remove();
      this._positionListener = new AnimatedValueSubscription(
        props.position,
        this._onPositionChange,
      );
    }

    _onPositionChange(): void {
      if (this._component) {
        const pointerEvents = this._computePointerEvents();
        // console.log(pointerEvents, this.props.navigation.state.index)
        if (this._pointerEvents !== pointerEvents) {
          // console.log('setting')
          this._pointerEvents = pointerEvents;
          this._component.setNativeProps({ pointerEvents });
        }
      }
    }

    _computePointerEvents(): string {
      const {
        navigation,
        position,
        scene,
      } = this.props;
      const params = (navigation.state.routes[navigation.state.index] || {}).params || {}

      if (params.shouldSeeBackground === true) {
        if (scene.index === navigation.state.index)
          return 'box-none'
        else if (scene.index + 1 == navigation.state.index)
          return 'auto'
      }
      if (scene.isStale || navigation.state.index !== scene.index) {
        // The scene isn't focused.
        return scene.index > navigation.state.index ? 'box-only' : 'none';
      }

      const offset = position.__getAnimatedValue() - navigation.state.index;
      if (Math.abs(offset) > MIN_POSITION_OFFSET) {
        // The positon is still away from scene's index.
        // Scene's children should not receive touches until the position
        // is close enough to scene's index.
        return 'auto'
        return 'box-only';
      }

      return 'auto';
    }
  }
  return Container;
}