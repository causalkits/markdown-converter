import { useState } from 'react'
import './App.css'
import MarkdownIt from 'markdown-it'
import mathjax3 from 'markdown-it-mathjax3'
import 'react-toastify/dist/ReactToastify.css'
import { ToastContainer, toast } from 'react-toastify'

// 配置 MathJax
window.MathJax = {
  tex: {
    inlineMath: [['$', '$']],
    displayMath: [['$$', '$$']],
    processEscapes: true,
    processEnvironments: true,
  },
  options: {
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
  }
}

// 创建 MarkdownIt 实例
const md = new MarkdownIt({
  html: true,
  breaks: false,  // 禁用自动换行
  typographer: true,
  linkify: true
})

// 使用 mathjax3 插件
md.use(mathjax3)

function App() {
  const [text, setText] = useState('')

  const convertDelimiters = (input) => {
    // 保留原始换行符
    let result = input
      // 处理显示公式
      .replace(/\\\[/g, '$$$$')
      .replace(/\\\]/g, '$$$$\n')
      // 处理行内公式
      .replace(/\\\(\s*/g, '$')
      .replace(/\s*\\\)/g, '$')
      // 处理换行：只保留两个及以上的换行符
      .replace(/\n{3,}/g, '\n\n')  // 限制最大连续换行数为2
      .replace(/([^\n])\n(?!\n)([^\n])/g, '$1 $2')  // 移除单个换行
    return result
  }

  const handleTextChange = (e) => {
    setText(e.target.value)
  }

  const convertedText = convertDelimiters(text)
  const htmlContent = md.render(convertedText)

  const handleCopy = () => {
    // 确保复制的文本包含换行符
    const textToCopy = convertedText
      .replace(/\r\n/g, '\n')  // 统一换行符
      .replace(/\r/g, '\n')    // 统一换行符
      .replace(/\n{3,}/g, '\n\n')  // 限制最大连续换行数为2

    navigator.clipboard.writeText(textToCopy)
    toast.success('复制成功！', {
      position: 'bottom-right',
      autoClose: 1500,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: true,
    })
  }

  return (
    <div className="app-container">
      <div className="editor">
        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder="在此输入Markdown文本..."
        />
      </div>
      <div className="preview">
        <div 
          className="preview-content"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
        <button onClick={handleCopy} className="copy-button">
          复制转换后的文本
        </button>
      </div>
      <ToastContainer />
    </div>
  )
}

export default App
