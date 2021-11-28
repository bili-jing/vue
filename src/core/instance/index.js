import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

// 此处不使用class语法是为了后续给Vue实例混入实例成员
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  //new Vue时，初始化参数
  this._init(options)
}

//给vm 注册_init 方法用于初始化参数
initMixin(Vue)
//给 vm 注册$data,$props,$el,$delete,$watch方法
stateMixin(Vue)
//给 vm 注册$on,$off,$emit,$once事件函数
eventsMixin(Vue)
//给 vm 注册_update,$forceUpdate,$destroy钩子函数
lifecycleMixin(Vue)
//混入 _render,$nextTick 方法
renderMixin(Vue)

export default Vue
