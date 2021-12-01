/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
    //在数据上定义__ob__属性，赋值为Observer实例
    def(value, '__ob__', this)
    //如果是数组
    if (Array.isArray(value)) {
      if (hasProto) {
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
      this.observeArray(value)
    } else {
      //如果是对象
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    //遍历对象的所有属性，并且定义为响应式(getter/setter)的数据
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  //如果不是对应或者是 Vnode 实例，则不做处理
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  //声明一个ob属性，用于存储Observe实例
  let ob: Observer | void
  //如果数据上存在__ob__属性并且属于Observe类的实例，则将ob属性赋值为value.__ob__
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (//否则
    //如果是可以操作为响应式的数据
    shouldObserve &&
    //不是服务端渲染
    !isServerRendering() &&
    //如果是数组或者是对象
    (Array.isArray(value) || isPlainObject(value)) &&
    //此数据是可拓展（即可以为他们添加新的属性）并且不是Vue实例
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    //如果不存在__ob__属性，并且可以做操作为响应式数据时
    //初始化Observer实例并且赋值给ob
    ob = new Observer(value)
  }
  //如果是根数据且存在ob实例存在,让计数器++
  if (asRootData && ob) {
    ob.vmCount++
  }
  //返回Observer实例
  return ob
}

/**
 * Define a reactive property on an Object.
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  //初始化依赖收集器
  const dep = new Dep()
  //获取obj[key]的属性描述符
  const property = Object.getOwnPropertyDescriptor(obj, key)
  // 如果属性描述符存在并且不可配置，则直接跳出 (Object.freszz等冻结方法会导致数据不会响应)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  //如果用户设置了getter和setter
  const getter = property && property.get
  const setter = property && property.set
  //如果getter不存在，或者setter存在。且没有传入val参数,将val赋值为obj[key]
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }
  //如果不是浅监听，则调用递归调用observe处理对象类型数据
  let childOb = !shallow && observe(val)
  //将数据添加getter/setter
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      //如果用户自定义了getter方法，则调用getter方法并将返回值赋值给value。否则直接赋值数据
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      //获取数据
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      //如果新值和旧值一样，或者是null，则直接return掉
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      //如果是开发环境并且用户自定义了setting
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      //如果设置值是对象，则对对象进行递归响应
      childOb = !shallow && observe(newVal)
      //派发更新
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
  //判断是否是undefined/null 或者 是否是原始类型string/number/symbol/boolean
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  //如果设置的对象是数组，并且设置的索引（key）在有效的取值范围内
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    //设置数组的长度为 key和target长度中最大的一个
    target.length = Math.max(target.length, key)
    //调用数组的splice方法为数组添加数据(注意：此splice方法是Vue自己实现的方法,查看:observer/array.js)
    target.splice(key, 1, val)
    //并且返回
    return val
  }
  //如果是对象，新增的属性已经存在对象上，并且不在对象的原型上
  if (key in target && !(key in Object.prototype)) {
    //说明已经是属性已经是响应式的了，直接赋值
    target[key] = val
    return val
  }
  //获取属性上__ob__属性，__ob__为属性的响应式对象实例,在new Observer时候会为属性添加此属性
  const ob = (target: any).__ob__
  //如果set的对象是Vue实例或者是根对象$data,则在开发环境中提示警告
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  //如果ob属性不存在，说明不是响应式数据，直接赋值并且返回
  if (!ob) {
    target[key] = val
    return val
  }
  //为ob.value (就是target)，设置一个响应式属性key
  defineReactive(ob.value, key, val)
  //派发已收集依赖更新
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
  //判断是否是undefined/null 或者 是否是原始类型string/number/symbol/boolean
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  //如果删除的对象是数组，并且设置的索引（key）在有效的取值范围内
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    //则调用 splice 删除数据
    target.splice(key, 1)
    return
  }
  //获取属性上__ob__属性，__ob__为属性的响应式对象实例,在new Observer时候会为属性添加此属性
  const ob = (target: any).__ob__
  //如果delete的对象是Vue实例或者是根对象$data,则在开发环境中提示警告
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  //如果要删除的属性不在对象和原型身上，则直接退出处理
  if (!hasOwn(target, key)) {
    return
  }
  //删除对象上的属性
  delete target[key]
  //如果不是响应式对象，直接退出
  if (!ob) {
    return
  }
  //如果是响应式对象，通知对象收集的依赖更新
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
