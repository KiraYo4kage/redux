/**
 * Prints a warning in the console if it exists.
 * 如果浏览器支持console则打印出warning信息
 *
 * @param {String} message The warning message.
 * @returns {void}
 */
export default function warning(message) {
  /* eslint-disable no-console */
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error(message)
  }
  /* eslint-enable no-console */
  try {
    // This error was thrown as a convenience so that if you enable
    // "break on all exceptions" in your console,
    // it would pause the execution at this line.
    // * 小提示：如果在开发者工具中勾选了“在异常出断点”，那么程序会在该处暂停，算是一个方便调试的小技巧（特别针对不支持console的低版本浏览器）
    throw new Error(message)
  } catch (e) {} // eslint-disable-line no-empty
}
