/**
 * @param {any} obj The object to inspect.
 * @returns {boolean} True if the argument appears to be a plain object.
 */
/**
 * @param {any} obj 受检查的对象.
 * @returns {boolean} 如果入参是一个简单对象的话，返回true.
 */
export default function isPlainObject(obj) {
  if (typeof obj !== 'object' || obj === null) return false

  let proto = obj
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto)
  }
  // proto为obj原型链的末端；而Object.getPrototypeOf(obj)为obj的__proto__
  // 意在判断obj的原型为__proto__为Object.prototype
  // 之所以采用while语句来判断而不是直接Object.getPrototypeOf(obj) === Object.prototype
  // 主要是为了避免产生跨域(realm)的参数传递，比如从另一个iframe中传过来的一个对象，即使它是一个简单对象
  // 因为不同iframe间的Object不是同一个引用，所以Object.getPrototypeOf(obj) !== Object.prototype
  // * 但是这个函数不支持判断Object.create(null)或使用Object.setPrototypeOf改变过原型引用的对象
  // * 有许多好事者提PR作者也没有通过，对此他的理由是这个方法不需要如此面面俱到的检查，只是一个简单的工具方法
  // * 不是很明白他为什么有这种双标的看法，但是最近的issue中作者有想法后续放弃这个方法，改用Lodash.isPlainObject
  return Object.getPrototypeOf(obj) === proto
}
