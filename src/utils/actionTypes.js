/**
 * These are private action types reserved by Redux.
 * For any unknown actions, you must return the current state.
 * If the current state is undefined, you must return the initial state.
 * Do not reference these action types directly in your code.
 */
/**
 * 这些是Redux占用的私有action类型
 * 对于任何未知的action，你必须返回当前的state （即reducers中的switch语句的default状态）
 * 如果当前state为undefined，你必须返回初始state
 * 请不要直接在你的代码中引用这些action类型
 */

// 生成随机的字符串，类似于a.b.c这样
// 将随机数转换为36进制数的字符串，可能有0-9，a-z组成
// 截取下标7到最后一位，中间用.隔开
const randomString = () =>
  Math.random()
    .toString(36)
    .substring(7)
    .split('')
    .join('.')

const ActionTypes = {
  INIT: `@@redux/INIT${randomString()}`, // createStore时会调用
  REPLACE: `@@redux/REPLACE${randomString()}`, // replaceReducers会调用
  PROBE_UNKNOWN_ACTION: () => `@@redux/PROBE_UNKNOWN_ACTION${randomString()}` // 可用于生成随机的action types
}

export default ActionTypes
