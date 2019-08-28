import $$observable from 'symbol-observable'

import ActionTypes from './utils/actionTypes'
import isPlainObject from './utils/isPlainObject'

/**
 * Creates a Redux store that holds the state tree.
 * The only way to change the data in the store is to call `dispatch()` on it.
 * 创建一个Redux仓库来储存状态树
 * 唯一改变仓库中数据的方式是调用 `store.dispatch()`
 * 
 * There should only be a single store in your app. To specify how different
 * parts of the state tree respond to actions, you may combine several reducers
 * into a single reducer function by using `combineReducers`.
 * 你的应用中应该只有单个仓库。为了列举如何将状态树的不同部分对应到actions，你可以利用 `combineReducers` 将多个reducers
 * 组合到一个reducer函数中
 *
 * @param {Function} reducer A function that returns the next state tree, given
 * the current state tree and the action to handle.
 * reducer是一个函数，它返回下一个状态树，接收当前状态树和待操作的action作为参数
 *
 * @param {any} [preloadedState] The initial state. You may optionally specify it
 * to hydrate the state from the server in universal apps, or to restore a
 * previously serialized user session.
 * If you use `combineReducers` to produce the root reducer function, this must be
 * an object with the same shape as `combineReducers` keys.
 * preloadedState是初始状态。你可以选择性地列出它，在大部分应用中以等待从服务端获取状态、或者还原
 * 前一次的序列化用户会话。
 * 如果你使用 `combineReducers` 来创建根reducer函数，它必须是一个和 `combineReducers` 中拥有
 * 相同属性和结构的对象。
 * 
 *
 * @param {Function} [enhancer] The store enhancer. You may optionally specify it
 * to enhance the store with third-party capabilities such as middleware,
 * time travel, persistence, etc. The only store enhancer that ships with Redux
 * is `applyMiddleware()`.
 * enhancer指代仓库增强器/强化剂。你可以选择性地列出它来给与仓库第三方的强化功能，比如中间件、
 * 时间旅行、持久化等等。唯一由Redux自身给出的仓库强化剂是 `applyMiddleware()`。
 *
 * @returns {Store} A Redux store that lets you read the state, dispatch actions
 * and subscribe to changes.
 * 返回值 store 对象，一个Redux仓库让你能读取状态，分派动作和订阅变化。
 */
export default function createStore(reducer, preloadedState, enhancer) {
  // 对入参来说，第二第三个参数都是可选参数，如果第二个参数为函数，则Redux将其视作enhancer处理，
  // 但若传入两个及以上函数参数，则认为用户误传入了多个enhancer，抛出警告，可以使用compose来组合enhancer
  if (
    (typeof preloadedState === 'function' && typeof enhancer === 'function') ||
    (typeof enhancer === 'function' && typeof arguments[3] === 'function')
  ) {
    throw new Error(
      'It looks like you are passing several store enhancers to ' +
        'createStore(). This is not supported. Instead, compose them ' +
        'together to a single function.'
    )
  }

  // 如果第二个参数为函数类型，则将其视为enhancer，而将初识状态视作undefined
  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState
    preloadedState = undefined
  }

  // 如果传入了enhancer，且不为函数，则抛出异常；若为函数，则返回enhancer返回的函数返回的结果
  // 这里有点拗口，可以看出enhancer是一个高阶函数，接受createStore为参数，返回一个强化后的createStore，
  // 然后重新传入reducer和preloadedState去生成store，最后把这个store作为外层的createStore的返回值。
  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }

    return enhancer(createStore)(reducer, preloadedState)
  }

  // reducer也必须是一个函数
  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }

  // 声明一些变量，后续会一一用到
  let currentReducer = reducer
  let currentState = preloadedState
  let currentListeners = []
  let nextListeners = currentListeners
  let isDispatching = false
  // isDispatching这个变量需要注意下，起初看网上的解释，说是为了保证数字一致性，防止两个action同时触发reducer改变状态
  // 从而导致难以排查的问题。但是js是单线程执行的，不可能有所谓的“同时触发reducer”的情况。后来才理解，作者是为了防止用户
  // 误操作，在reducer中再次dispatch action，从而导致死循环，诸如此类的情况，才设置了这一变量。


  /**
   * This makes a shallow copy of currentListeners so we can use
   * nextListeners as a temporary list while dispatching.
   * 这个函数主要是在订阅列表发生变化时被调用，它将nextListeners赋值为一个currentListeners的浅拷贝，
   * 以在dispatch过程中被临时使用
   *
   * This prevents any bugs around consumers calling
   * subscribe/unsubscribe in the middle of a dispatch.
   * 这是为了防止使用者在dispatch中途调用 subscribe/unsubscribe
   * 
   */
  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice() // 创建一个浅拷贝
    }
  }

  /**
   * Reads the state tree managed by the store.
   * 读取当前状态树
   *
   * @returns {any} The current state tree of your application.
   */
  function getState() {
    // 同样是为了确保数据一致性，防止在reducer中调用getState来改变state，影响reducer的结果
    // 如果要在reducer中使用state，它已经被作为参数传入了，可以直接使用
    if (isDispatching) {
      throw new Error(
        'You may not call store.getState() while the reducer is executing. ' +
          'The reducer has already received the state as an argument. ' +
          'Pass it down from the top reducer instead of reading it from the store.'
      )
    }

    return currentState
  }

  /**
   * Adds a change listener. It will be called any time an action is dispatched,
   * and some part of the state tree may potentially have changed. You may then
   * call `getState()` to read the current state tree inside the callback.
   * subscribe可以用来添加一个状态变化的监听者。每当有动作被派发时它(listener)就会被调用，同时状态树
   * 的某些部分可能会发生变化。之后你可以在回调函数中调用 `getState()` 来读取当前状态树。
   * 
   * You may call `dispatch()` from a change listener, with the following
   * caveats:
   * 你可以从变化监听者的回调函数中调用 `dispatch()` ，但要注意一下两点警告
   * 
   * 1. The subscriptions are snapshotted just before every `dispatch()` call.
   * If you subscribe or unsubscribe while the listeners are being invoked, this
   * will not have any effect on the `dispatch()` that is currently in progress.
   * However, the next `dispatch()` call, whether nested or not, will use a more
   * recent snapshot of the subscription list.
   * 1、订阅队列在每次 `dispatch()` 被调用时会形成一个快照。如果你在监听者被调用的时候进行订阅
   * 或取消订阅，这不会对当前正在进行的 `dispatch()` 产生任何影响。然而，对于下一次 `dispatch()`
   * 调用，无论是否被嵌套，会使用最近的订阅列表快照。
   *
   * 2. The listener should not expect to see all state changes, as the state
   * might have been updated multiple times during a nested `dispatch()` before
   * the listener is called. It is, however, guaranteed that all subscribers
   * registered before the `dispatch()` started will be called with the latest
   * state by the time it exits.
   * 2、订阅器不应该注意到所有 state 的变化，在订阅器被调用之前，往往由于嵌套的 dispatch() 导致 state 发生多次的改变。
   * 保证所有的监听器都注册在 dispatch() 启动之前，这样，在调用监听器的时候就会传入监听器所存在时间里最新的一次 state。
   * 这里有一个英文小知识点，might have been虚拟语气表示猜测，注意和could’ve been(本可以而现在没有)区分开
   *
   * @param {Function} listener A callback to be invoked on every dispatch.
   * @returns {Function} A function to remove this change listener.
   */
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected the listener to be a function.')
    }

    // 禁止在reducer中调用订阅
    if (isDispatching) {
      throw new Error(
        'You may not call store.subscribe() while the reducer is executing. ' +
          'If you would like to be notified after the store has been updated, subscribe from a ' +
          'component and invoke store.getState() in the callback to access the latest state. ' +
          'See https://redux.js.org/api-reference/store#subscribelistener for more details.'
      )
    }

    // 利用闭包，根据 isSubscribed 变量判断当前订阅是否有效
    let isSubscribed = true

    // 将nextListeners赋值为currentListeners的浅拷贝，并将当前listener加入nextListeners
    ensureCanMutateNextListeners()
    nextListeners.push(listener)

    // 返回当前订阅的取消函数
    return function unsubscribe() {
      if (!isSubscribed) {
        return
      }

      // 禁止在reducer中调用取消订阅
      if (isDispatching) {
        throw new Error(
          'You may not unsubscribe from a store listener while the reducer is executing. ' +
            'See https://redux.js.org/api-reference/store#subscribelistener for more details.'
        )
      }

      isSubscribed = false

      // 将nextListeners赋值为currentListeners的浅拷贝，删除当前listener。且将currentListeners置为空。
      ensureCanMutateNextListeners()
      const index = nextListeners.indexOf(listener)
      nextListeners.splice(index, 1)
      currentListeners = null
    }
  }

  /**
   * Dispatches an action. It is the only way to trigger a state change.
   * dispatch函数，派发一个动作。这是唯一用来触发状态变化的方法
   * 不要在外部手动设置state的值，这样不会触发listener且容易导致下次dispatch的结果异常
   * 
   * The `reducer` function, used to create the store, will be called with the
   * current state tree and the given `action`. Its return value will
   * be considered the **next** state of the tree, and the change listeners
   * will be notified.
   * 在这个函数中，那个用来创建store的 `reducer` 函数会被调用，传入当前状态树和dispatch的 `action`，
   * reducer的返回值会被当做下一个状态树，同时所有订阅中的listener会被通知。
   *
   * The base implementation only supports plain object actions. If you want to
   * dispatch a Promise, an Observable, a thunk, or something else, you need to
   * wrap your store creating function into the corresponding middleware. For
   * example, see the documentation for the `redux-thunk` package. Even the
   * middleware will eventually dispatch plain object actions using this method.
   * 基础实现只支持简单对象作为action。如果你想要派发Promise、Observable、thunk或其他异步action，
   * 你需要将你的store创建函数包裹在相应的中间件中。比如，可以看看 `redux-thunk` 的文档。最终中间件也会
   * 调用这个方法来派发简单对象的action。
   *
   * @param {Object} action A plain object representing “what changed”. It is
   * a good idea to keep actions serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An action must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for action types.
   * action，一个能表示“发生什么变化”的简单对象。最好保持action的可序列化，因为你可以记录和重放用户
   * 的会话记录，或者使用 `redux-devtools` 的时间旅行功能（如果type为symbol类型，虽然有效避免action
   * 名称冲突，但是对象不再可序列化了）。一个action必须用一个不为undefined的type属性，并且最好用一个
   * 字符串常量。
   *
   * @returns {Object} For convenience, the same action object you dispatched.
   * 为了方便，将原action对象返回
   *
   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
   * return something else (for example, a Promise you can await).
   * 注意，如果你使用一个自定义的中间件，他可能会包裹 `dispatch()` 从而返回其他内容（例如Promise，以便配合await）
   * 
   */
  function dispatch(action) {
    // action必须是简单对象
    if (!isPlainObject(action)) {
      throw new Error(
        'Actions must be plain objects. ' +
          'Use custom middleware for async actions.'
      )
    }

    // action.type必须不为undefined
    if (typeof action.type === 'undefined') {
      throw new Error(
        'Actions may not have an undefined "type" property. ' +
          'Have you misspelled a constant?'
      )
    }

    // 保持数据一致性，阻止用户在reducers中的dispatch
    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }

    try {
      /**
       * 注意：这里就是每个函数中都要判断 `isDispatching` 的原因了。可以看到先将 `isDispatching`
       * 置为了true，然后执行当前reducer，如果reducer中有任何对store的操作，就会导致数据不一致，或是
       * 出现死循环
       */
      isDispatching = true
      currentState = currentReducer(currentState, action)
    } finally {
      // reducer执行完成或是抛出异常都要讲 `isDispatching` 重置，不然就再也不能dispatch了。。。
      isDispatching = false
    }

    // 将当前 `currentListeners` 指向 `nextListeners` ，并执行所有listeners
    const listeners = (currentListeners = nextListeners)
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i]
      listener()
    }

    // 最后返回原有的action对象
    return action
  }

  /**
   * Replaces the reducer currently used by the store to calculate the state.
   * 替换当前store使用的reducer，来计算状态
   *
   * You might need this if your app implements code splitting and you want to
   * load some of the reducers dynamically. You might also need this if you
   * implement a hot reloading mechanism for Redux.
   * 如果你的应用实现了代码分割，你可能需要用这个函数来动态加载reducer。如果你为Redux实现了
   * 热加载机制，可能也需要用到这个函数。
   *
   * @param {Function} nextReducer The reducer for the store to use instead.
   * @returns {void}
   */
  function replaceReducer(nextReducer) {
    // reducer必须是函数
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.')
    }

    // 替换reducer
    currentReducer = nextReducer

    // This action has a similiar effect to ActionTypes.INIT.
    // Any reducers that existed in both the new and old rootReducer
    // will receive the previous state. This effectively populates
    // the new state tree with any relevant data from the old one.
    // ActionTypes.REPLACE 和 ActionTypes.INIT 有着相似的作用。
    // 所有新旧根reducer中都存在的reducer都会接收的前一个状态。相关联的数据会从
    // 老状态树传递到新状态树。
    dispatch({ type: ActionTypes.REPLACE })
  }

  /**
   * Interoperability point for observable/reactive libraries.
   * @returns {observable} A minimal observable of state changes.
   * For more information, see the observable proposal:
   * https://github.com/tc39/proposal-observable
   */
  function observable() {
    const outerSubscribe = subscribe
    return {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe(observer) {
        if (typeof observer !== 'object' || observer === null) {
          throw new TypeError('Expected the observer to be an object.')
        }

        function observeState() {
          if (observer.next) {
            observer.next(getState())
          }
        }

        observeState()
        const unsubscribe = outerSubscribe(observeState)
        return { unsubscribe }
      },

      [$$observable]() {
        return this
      }
    }
  }

  // When a store is created, an "INIT" action is dispatched so that every
  // reducer returns their initial state. This effectively populates
  // the initial state tree.
  // 初始化状态树，所有reducer返回默认状态
  dispatch({ type: ActionTypes.INIT })

  // 向外暴露api
  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  }
}
