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
  breaks: true,
  typographer: true
})

// 使用 mathjax3 插件
md.use(mathjax3)

function App() {
  const [text, setText] = useState('')

  const convertDelimiters = (input) => {
    let result = input
      // 处理显示公式，移除 \[ 和 \] 前后的空格
      .replace(/\s*\\\[\s*/g, '$$')
      .replace(/\s*\\\]\s*/g, '$$')
      // 处理行内公式，移除 \( 和 \) 前后的空格
      .replace(/\s*\\\(\s*/g, '$')
      .replace(/\s*\\\)\s*/g, '$')
    return result
  }

  const handleTextChange = (e) => {
    setText(e.target.value)
  }

  const convertedText = convertDelimiters(text)
  const htmlContent = md.render(convertedText)

  const handleCopy = () => {
    navigator.clipboard.writeText(convertedText)
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
