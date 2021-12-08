/* @flow */

import config from '../config'
import VNode, { createEmptyVNode } from './vnode'
import { createComponent } from './create-component'
import { traverse } from '../observer/traverse'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isObject,
  isPrimitive,
  resolveAsset
} from '../util/index'

import {
  normalizeChildren,
  simpleNormalizeChildren
} from './helpers/index'

const SIMPLE_NORMALIZE = 1
const ALWAYS_NORMALIZE = 2

// wrapper function for providing a more flexible interface
// without getting yelled at by flow
export function createElement (
  context: Component, //Vue实例
  tag: any,//标签
  data: any,//标签描述
  children: any,//子元素或者内容
  normalizationType: any,
  alwaysNormalize: boolean //是否是处理用户传入的render
): VNode | Array<VNode> {
  //处理参数情况
  //如果data是数组或者是基础类型,说明没有传递data选项，
  if (Array.isArray(data) || isPrimitive(data)) {
    normalizationType = children
    children = data
    data = undefined
  }
  //如果是用户手动传入的render
  if (isTrue(alwaysNormalize)) {
    normalizationType = ALWAYS_NORMALIZE
  }
  return _createElement(context, tag, data, children, normalizationType)
}

export function _createElement (
  context: Component,
  tag?: string | Class<Component> | Function | Object,
  data?: VNodeData,
  children?: any,
  normalizationType?: number
): VNode | Array<VNode> {
  //如果data存在，说明有对tag的描述，并且data是响应式对象。则提示警告，并且返回一个空Vnode
  if (isDef(data) && isDef((data: any).__ob__)) {
    process.env.NODE_ENV !== 'production' && warn(
      `Avoid using observed data object as vnode data: ${JSON.stringify(data)}\n` +
      'Always create fresh vnode data objects in each render!',
      context
    )
    return createEmptyVNode()
  }
  // object syntax in v-bind
  //如果如果data存在，并且存在is属性。说明是动态组件:<component v-bind:id="currentTabComponent"></component>
  if (isDef(data) && isDef(data.is)) {
    //将is属性对应的组件赋值给tag属性
    tag = data.is
  }
  //如果tag不存在，说明:is是flase,则直接返回一个空的节点
  if (!tag) {
    // in case of component :is set to falsy value
    return createEmptyVNode()
  }
  // warn against non-primitive key
  //如果设置了key并且key不是基本类型，则提示警告（key需要是string/number类型数据）
  if (process.env.NODE_ENV !== 'production' &&
    isDef(data) && isDef(data.key) && !isPrimitive(data.key)
  ) {
    if (!__WEEX__ || !('@binding' in data.key)) {
      warn(
        'Avoid using non-primitive value as key, ' +
        'use string/number value instead.',
        context
      )
    }
  }
  // support single function children as default scoped slot
  //处理插槽(slot)
  if (Array.isArray(children) &&
    typeof children[0] === 'function'
  ) {
    data = data || {}
    data.scopedSlots = { default: children[0] }
    children.length = 0
  }
  //如果是用户render
  if (normalizationType === ALWAYS_NORMALIZE) {
    //返回一维数组，处理用户传入的render
    children = normalizeChildren(children)
  } else if (normalizationType === SIMPLE_NORMALIZE) { //模板编译render
    //把多维数组，转换成一维数组
    children = simpleNormalizeChildren(children)
  }
  let vnode, ns
  //如果tag是string类型
  if (typeof tag === 'string') {
    let Ctor
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag)
    //如果tag是HTML保留关键字,则在开发环境提示警告信息，并且创建一个vnode对象
    if (config.isReservedTag(tag)) {
      // platform built-in elements
      if (process.env.NODE_ENV !== 'production' && isDef(data) && isDef(data.nativeOn) && data.tag !== 'component') {
        warn(
          `The .native modifier for v-on is only valid on components but it was used on <${tag}>.`,
          context
        )
      }
      vnode = new VNode(
        config.parsePlatformTagName(tag), data, children,
        undefined, undefined, context
      )
      //如果是自定义组件，通过tag在所有的组件中($options中的components)获取对应的组件名称处理
    } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
      // component
      //则创建组件对应Vnode
      vnode = createComponent(Ctor, data, context, children, tag)
    } else {
      // unknown or unlisted namespaced elements
      // check at runtime because it may get assigned a namespace when its
      // parent normalizes children
      //如果是自定义标签，则直接创建对应的标签vnode
      vnode = new VNode(
        tag, data, children,
        undefined, undefined, context
      )
    }
  } else {
    // direct component options / constructor
    //如果是组件，则创建组件vnode
    vnode = createComponent(tag, data, context, children)
  }
  //如果是数组，直接放回vnode
  if (Array.isArray(vnode)) {
    return vnode
  } else if (isDef(vnode)) {
    //不是数组，则处理命名空间
    if (isDef(ns)) applyNS(vnode, ns)
    if (isDef(data)) registerDeepBindings(data)
    return vnode
  } else {
    //都不成立则返回空注释vnode
    return createEmptyVNode()
  }
}

function applyNS (vnode, ns, force) {
  vnode.ns = ns
  if (vnode.tag === 'foreignObject') {
    // use default namespace inside foreignObject
    ns = undefined
    force = true
  }
  if (isDef(vnode.children)) {
    for (let i = 0, l = vnode.children.length; i < l; i++) {
      const child = vnode.children[i]
      if (isDef(child.tag) && (
        isUndef(child.ns) || (isTrue(force) && child.tag !== 'svg'))) {
        applyNS(child, ns, force)
      }
    }
  }
}

// ref #5318
// necessary to ensure parent re-render when deep bindings like :style and
// :class are used on slot nodes
function registerDeepBindings (data) {
  if (isObject(data.style)) {
    traverse(data.style)
  }
  if (isObject(data.class)) {
    traverse(data.class)
  }
}
