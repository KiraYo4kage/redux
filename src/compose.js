/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 * 从右到左组合调用一些单参数函数，最右边的函数可以接受多个参数，因为它为之前组合好的函数
 * 提供签名。
 * 这个函数会在applyMiddleware.js 或者 compose enhancer 时被使用。
 *
 * @param {...Function} funcs The functions to compose.
 * 需要被串联的函数们
 * 
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 * 得到一个函数，它是由多个函数从右往左执行并串联调用产生的，即右边函数的结果作为左边函数的入参，
 * 比如 compose(f, g, h) 会得到和 (...args) => f(g(h(...args))) 一样的结果。
 * 这样执行返回函数的时候，调用栈顺序就会是f->g->h->g->f，类似于一个洋葱圈
 * 
 */

export default function compose(...funcs) {
  // 没有入参，则返回一个函数，它返回获得的第一个参数
  if (funcs.length === 0) {
    return arg => arg
  }

  // 如果只有一个入参，则直接返回它。这边最好加一个提示，如果参数不是函数，后面调用的时候会报错
  if (funcs.length === 1) {
    return funcs[0]
  }

  // Array.prototype.reduce 方法，对于没有传入初识值时，会把数组第一项作为初始值，然后从数组
  // 第二项开始遍历数组。这里的过程为每次先执行当前项的函数b，参数保持不变。然后把执行结果传入之前
  // 受处理过的函数a，以此重复，打到串联调用的效果。
  return funcs.reduce((a, b) => (...args) => a(b(...args)))
}
