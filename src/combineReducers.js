import ActionTypes from './utils/actionTypes'
import warning from './utils/warning'
import isPlainObject from './utils/isPlainObject'

// 若发现reducer返回的state为 undefined 时，调用该函数获取警告文案
// 如果reducer未识别到action，应该将原先的state重新返回，如果希望将状态置空
// 应该返回 null ，而不是 undefined
function getUndefinedStateErrorMessage(key, action) {
  const actionType = action && action.type
  const actionDescription =
    (actionType && `action "${String(actionType)}"`) || 'an action'

  return (
    `Given ${actionDescription}, reducer "${key}" returned undefined. ` +
    `To ignore an action, you must explicitly return the previous state. ` +
    `If you want this reducer to hold no value, you can return null instead of undefined.`
  )
}

// 判断state的结构是否符合预期，并返回警告文案
function getUnexpectedStateShapeWarningMessage(
  inputState,
  reducers,
  action,
  unexpectedKeyCache
) {
  // 所有reducer的属性名
  const reducerKeys = Object.keys(reducers)
  // 判断state是初始化状态还是reducer的参数state
  const argumentName =
    action && action.type === ActionTypes.INIT
      ? 'preloadedState argument passed to createStore'
      : 'previous state received by the reducer'

  // reducers中没有reducer，生成的store就没有意义了
  if (reducerKeys.length === 0) {
    return (
      'Store does not have a valid reducer. Make sure the argument passed ' +
      'to combineReducers is an object whose values are reducers.'
    )
  }

  // inputState 必须是简单对象
  if (!isPlainObject(inputState)) {
    return (
      `The ${argumentName} has unexpected type of "` +
      {}.toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] + // 获取 `inputState` 的类型，如数组[object Array],得到结果为 Array
      `". Expected argument to be an object with the following ` +
      `keys: "${reducerKeys.join('", "')}"` // 拼接后的keys类似 "a","b","c" 这样
    )
  }

  // 遍历得到reducer中不包含的状态属性名，并且保存到 `unexpectedKeyCache` 中
  const unexpectedKeys = Object.keys(inputState).filter(
    key => !reducers.hasOwnProperty(key) && !unexpectedKeyCache[key] // 防止重复警告相同的字段
  )

  unexpectedKeys.forEach(key => {
    unexpectedKeyCache[key] = true
  })

  // 如果是通过replaceReducer触发的reducer，则无需给出警告，因为原状态可能和新的reducer无关（如代码分割）
  if (action && action.type === ActionTypes.REPLACE) return

  // reducerKeys中不包含的stateKey将会被忽略
  if (unexpectedKeys.length > 0) {
    return (
      `Unexpected ${unexpectedKeys.length > 1 ? 'keys' : 'key'} ` +
      `"${unexpectedKeys.join('", "')}" found in ${argumentName}. ` +
      `Expected to find one of the known reducer keys instead: ` +
      `"${reducerKeys.join('", "')}". Unexpected keys will be ignored.`
    )
  }
}

// 推断reducer的结构
function assertReducerShape(reducers) {
  Object.keys(reducers).forEach(key => {
    // 尝试用每个reducer来初始化状态，若返回的初始化状态为undefined，则抛出异常警告
    // 和createStore.js中一样，提示用户如果不想设置默认值，应该将初识状态设置为null
    const reducer = reducers[key]
    const initialState = reducer(undefined, { type: ActionTypes.INIT })

    if (typeof initialState === 'undefined') {
      throw new Error(
        `Reducer "${key}" returned undefined during initialization. ` +
          `If the state passed to the reducer is undefined, you must ` +
          `explicitly return the initial state. The initial state may ` +
          `not be undefined. If you don't want to set a value for this reducer, ` +
          `you can use null instead of undefined.`
      )
    }

    // 用随机type的action来触发reducer，如果初始化状态不为undefined而这里返回未undefined
    // 说明该reducer中没有对于未知的action做默认处理，而且还指定了Redux内部的 ` ActionTypes.INIT`
    // action类型。可以说是错上加错。
    // 正确的做法是在reducer中对于任何未知的action做默认处理，返回当前的状态，初始状态可以是null但不能是undefined
    if (
      typeof reducer(undefined, {
        type: ActionTypes.PROBE_UNKNOWN_ACTION()
      }) === 'undefined'
    ) {
      throw new Error(
        `Reducer "${key}" returned undefined when probed with a random type. ` +
          `Don't try to handle ${ActionTypes.INIT} or other actions in "redux/*" ` +
          `namespace. They are considered private. Instead, you must return the ` +
          `current state for any unknown actions, unless it is undefined, ` +
          `in which case you must return the initial state, regardless of the ` +
          `action type. The initial state may not be undefined, but can be null.`
      )
    }
  })
}

/**
 * Turns an object whose values are different reducer functions, into a single
 * reducer function. It will call every child reducer, and gather their results
 * into a single state object, whose keys correspond to the keys of the passed
 * reducer functions.
 * 接受一个对象作为参数，它包含了一些reducer函数，然后将这个对象转换成单一的reducer函数。
 * 它会调用所有子reducer，并将它们的结果聚合到单个状态对象中，它的属性名和所有传入的reducer
 * 函数的属性名相对应。
 *
 * @param {Object} reducers An object whose values correspond to different
 * reducer functions that need to be combined into one. One handy way to obtain
 * it is to use ES6 `import * as reducers` syntax. The reducers may never return
 * undefined for any action. Instead, they should return their initial state
 * if the state passed to them was undefined, and the current state for any
 * unrecognized action.
 * 一个包含了和需要组合在一起的所有reducer相对应的属性值的对象。其中一个便利获取方式是通过ES6的
 *  `import * as reducers` 语法。reducer对于任何action都不同返回undefined。对于不识别的action，
 * 如果传入reducer的state为undefined，则应该返回初始化state；否则返回传入的state
 *
 * @returns {Function} A reducer function that invokes every reducer inside the
 * passed object, and builds a state object with the same shape.
 * 返回一个reducer函数，它会调用所有被传入的对象中包含的reducer，然后构建并返回一个和被传入reducer
 * 相同结构的状态对象。
 */
export default function combineReducers(reducers) {
  // 获取所有子reducer的属性名
  const reducerKeys = Object.keys(reducers)
  // 创建一个空对象作为准备最终返回的根reducer
  const finalReducers = {}
  for (let i = 0; i < reducerKeys.length; i++) {
    const key = reducerKeys[i]

    // 在非生产环境中给出警告，reducer不能为undefined
    if (process.env.NODE_ENV !== 'production') {
      if (typeof reducers[key] === 'undefined') {
        warning(`No reducer provided for key "${key}"`)
      }
    }

    // reducer为函数时才将它加入finalReducers
    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key]
    }
  }

  // 全部添加完成后取出所有finalReducers中的属性名
  const finalReducerKeys = Object.keys(finalReducers)

  // This is used to make sure we don't warn about the same
  // keys multiple times.
  // unexpectedKeyCache是为了保证reducer中不存在的state属性不重复提示
  let unexpectedKeyCache
  if (process.env.NODE_ENV !== 'production') {
    unexpectedKeyCache = {}
  }

  // 检查reducer对不识别的action是否返回默认值或当前状态
  // try-catch了，程序不会被阻断，只会给shapeAssertionError赋值
  let shapeAssertionError
  try {
    assertReducerShape(finalReducers)
  } catch (e) {
    shapeAssertionError = e
  }

  // 返回一个根reducer函数，它内部会调用所有子reducer
  return function combination(state = {}, action) {
    // 利用闭包，前面如果assertReducerShape发现不符合的reducer结构，这里reducer执行时抛出异常
    if (shapeAssertionError) {
      throw shapeAssertionError
    }

    if (process.env.NODE_ENV !== 'production') {
      const warningMessage = getUnexpectedStateShapeWarningMessage(
        state,
        finalReducers,
        action,
        unexpectedKeyCache
      )
      if (warningMessage) {
        warning(warningMessage)
      }
    }

    // 创建一个标识，用来判断状态是否变更
    let hasChanged = false
    // 创建一个空对象作为下个状态树的根节点
    const nextState = {}
    // 遍历且执行所有finalReducer中的子reducer
    for (let i = 0; i < finalReducerKeys.length; i++) {
      const key = finalReducerKeys[i]
      const reducer = finalReducers[key]
      const previousStateForKey = state[key]
      const nextStateForKey = reducer(previousStateForKey, action)
      // 若某个reducer返回的状态为undefined，则抛出异常警告
      if (typeof nextStateForKey === 'undefined') {
        const errorMessage = getUndefinedStateErrorMessage(key, action)
        throw new Error(errorMessage)
      }
      // 将执行结果存到新的根节点下
      nextState[key] = nextStateForKey
      // 判断状态树是否改变，若之前的循环中已经有变化则无需再判断
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey
    }
    // 例如使用replaceReducer后，state属性可能与reducer属性不对应了，所以光比较所有
    // reducer中的属性是不够的，还要比较state和reducer属性数量是否相同。
    hasChanged =
      hasChanged || finalReducerKeys.length !== Object.keys(state).length
    // 若没有变化，直接返回原状态树，否则返回新的状态树
    return hasChanged ? nextState : state
  }
}
