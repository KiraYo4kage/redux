// 接受一个actionCreator和store.dispatch，返回一个函数。
// 执行这个函数，可以方便的派发action。这里用到了Function.prototype.apply
// 来展开arguments，并传入actionCreator
function bindActionCreator(actionCreator, dispatch) {
  return function() {
    return dispatch(actionCreator.apply(this, arguments))
  }
}

/**
 * Turns an object whose values are action creators, into an object with the
 * same keys, but with every function wrapped into a `dispatch` call so they
 * may be invoked directly. This is just a convenience method, as you can call
 * `store.dispatch(MyActionCreators.doSomething())` yourself just fine.
 * 将一个属性都是action创建函数的对象转化为拥有相同属性，不过每个函数都被包裹在 `dispatch`
 * 调用中，以便让他们能被直接调用，这只是一个语法糖，你也可以自己调用
 * `store.dispatch(MyActionCreators.doSomething())` 来实现。
 * 这个函数可以配合 `react-redux` 的 `mapDispatchToProps`使用
 *
 * For convenience, you can also pass an action creator as the first argument,
 * and get a dispatch wrapped function in return.
 *
 * @param {Function|Object} actionCreators An object whose values are action
 * creator functions. One handy way to obtain it is to use ES6 `import * as`
 * syntax. You may also pass a single function.
 * 一个属性都是action创建函数的对象。其中一个获取它的方法是使用ES6的 `import * as` 语法。
 * 你也可以传入单个action创建函数。
 *
 * @param {Function} dispatch The `dispatch` function available on your Redux
 * store.
 * 当你用createStore创建了Redux仓库后，该仓库对象中的 `dispatch` 函数。
 *
 * @returns {Function|Object} The object mimicking the original object, but with
 * every action creator wrapped into the `dispatch` call. If you passed a
 * function as `actionCreators`, the return value will also be a single
 * function.
 * 返回值仿照原始对象，但是每个action穿件函数都被包裹在 `dispatch` 调用中。如果你前面传入的是一个
 * 作为 `actionCreators` 的函数，返回值也会是单个函数。
 */
export default function bindActionCreators(actionCreators, dispatch) {
  if (typeof actionCreators === 'function') {
    return bindActionCreator(actionCreators, dispatch)
  }

  // 当参数 `actionCreators` 不为对象或是为空对象时抛出异常，提示用户 `actionCreators` 必须是
  // 对象或函数类型，这里推测用户可能错写为 "import ActionCreators from" 而没有导出默认值
  if (typeof actionCreators !== 'object' || actionCreators === null) {
    throw new Error(
      `bindActionCreators expected an object or a function, instead received ${
        actionCreators === null ? 'null' : typeof actionCreators
      }. ` +
        `Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?`
    )
  }

  const boundActionCreators = {}
  // 遍历actionCreators，将每个actionCreator做 `bindActionCreator` 处理，将结果保存到
  // `boundActionCreators` 中。
  // 这里写法可能不太严禁，如果用户往 Object.prototype 写入了一些扩展函数，这里用 for in 也会
  // 遍历出来。
  for (const key in actionCreators) {
    const actionCreator = actionCreators[key]
    if (typeof actionCreator === 'function') {
      boundActionCreators[key] = bindActionCreator(actionCreator, dispatch)
    }
  }
  // 返回用dispatch包裹后的actionCreator集合
  return boundActionCreators
}
