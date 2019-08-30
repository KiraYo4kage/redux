import compose from './compose'

/**
 * Creates a store enhancer that applies middleware to the dispatch method
 * of the Redux store. This is handy for a variety of tasks, such as expressing
 * asynchronous actions in a concise manner, or logging every action payload.
 * 创建一个仓库加强器来给Redux仓库的dispatch方法提供中间件。这会对许多任务带来便利，比如用
 * 简明的形式表示异步动作，或者记录下所有动作负载。
 *
 * See `redux-thunk` package as an example of the Redux middleware.
 *  `redux-thunk` 包是一个很好的Redux中间件的例子
 * 
 * Because middleware is potentially asynchronous, this should be the first
 * store enhancer in the composition chain.
 * 因为中间件可能是异步的，所以这应该是构成链中的第一个仓库加强器
 *
 * Note that each middleware will be given the `dispatch` and `getState` functions
 * as named arguments.
 * 注意，每个中间件都会被传入 `dispatch` 和 `getState` 函数作为的参数
 *
 * @param {...Function} middlewares The middleware chain to be applied.
 * 入参为被提供的中间件链
 * 
 * @returns {Function} A store enhancer applying the middleware.
 * 一个提供中间件功能的仓库加强器函数
 * 
 */
export default function applyMiddleware(...middlewares) {
  // 返回的是一个函数，也就是一个enhancer，以createStore作为入参，并最终返回store
  return createStore => (...args) => {
    // 先调用Redux自带的createStore生成原始的store
    const store = createStore(...args)
    // 创建一个临时的dispatch，执行这个函数会直接抛出异常。这么做是为了防止用户误操作，
    // 而在中间件中调用dispatch，这样执行顺序在该中间件之后的其他中间件就不会被包含在
    // 这次dispatch中了
    let dispatch = () => {
      throw new Error(
        'Dispatching while constructing your middleware is not allowed. ' +
          'Other middleware would not be applied to this dispatch.'
      )
    }

    // 为所有中间件提供的固定结构的统一入参
    const middlewareAPI = {
      getState: store.getState,
      dispatch: (...args) => dispatch(...args)
    }
    // chain就是一个数组，每个项为每个中间件的执行结果
    const chain = middlewares.map(middleware => middleware(middlewareAPI))
    // 通过compose组合所有中间件，其结果返回一个函数，这个函数的作用是将原始的
    // dispatch转换为中间件层层处理过的dispatch
    dispatch = compose(...chain)(store.dispatch)

    // 将原始store中的dispatch替换成中间件处理过的dispatch，并将整个store返回，成为
    // createStore的返回结果
    return {
      ...store,
      dispatch
    }
  }
}
