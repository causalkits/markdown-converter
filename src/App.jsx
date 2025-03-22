import { useState } from 'react'
import './App.css'
import MarkdownIt from 'markdown-it'
import mathjax3 from 'markdown-it-mathjax3'
import 'react-toastify/dist/ReactToastify.css'
import { ToastContainer, toast } from 'react-toastify'

// 修改 MathJax 配置
window.MathJax = {
  loader: {load: ['[tex]/html']},
  tex: {
    packages: {'[+]': ['html']},
    inlineMath: [['$', '$']],
    displayMath: [['$$', '$$']],
    processEscapes: true,
    processEnvironments: true,
  },
  options: {
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
  },
  startup: {
    ready: () => {
      console.log('MathJax is loaded and ready');
    }
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

const styles = {
  page: {
    padding: 40,
    fontFamily: 'Times-Roman'
  },
  text: {
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 1.5
  },
  heading1: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold'
  },
  heading2: {
    fontSize: 20,
    marginBottom: 15,
    fontWeight: 'bold'
  },
  heading3: {
    fontSize: 16,
    marginBottom: 12,
    fontWeight: 'bold'
  },
  blockquote: {
    marginLeft: 20,
    paddingLeft: 10,
    borderLeft: '2 solid #ccc',
    color: '#666',
    fontStyle: 'italic'
  },
  listItem: {
    fontSize: 12,
    marginBottom: 5,
    flexDirection: 'row'
  },
  bullet: {
    width: 10,
    marginRight: 5
  },
  code: {
    fontFamily: 'Courier',
    backgroundColor: '#f5f5f5',
    padding: 8,
    marginVertical: 10,
    fontSize: 10
  }
}

const parseContentForPdf = (html) => {
  const div = document.createElement('div')
  div.innerHTML = html
  const content = []

  const processNode = (node) => {
    switch (node.nodeName) {
      case 'H1':
        content.push({
          text: node.textContent,
          fontSize: 24,
          bold: true,
          margin: [0, 20, 0, 10]
        })
        break
      case 'H2':
        content.push({
          text: node.textContent,
          fontSize: 20,
          bold: true,
          margin: [0, 15, 0, 8]
        })
        break
      case 'H3':
        content.push({
          text: node.textContent,
          fontSize: 16,
          bold: true,
          margin: [0, 12, 0, 6]
        })
        break
      case 'P':
        if (node.querySelector('.math-display')) {
          content.push({
            text: node.textContent,
            alignment: 'center',
            margin: [0, 10, 0, 10],
            fontSize: 14
          })
        } else if (node.querySelector('.math-inline')) {
          content.push({
            text: node.textContent,
            fontSize: 12
          })
        } else {
          content.push({
            text: node.textContent,
            fontSize: 12,
            margin: [0, 5, 0, 5]
          })
        }
        break
      case 'PRE':
        content.push({
          text: node.textContent,
          fontSize: 10,
          font: 'Courier',
          background: '#f5f5f5',
          margin: [0, 5, 0, 5],
          padding: [5, 5, 5, 5]
        })
        break
      case 'UL':
        const items = Array.from(node.children).map(li => ({
          text: li.textContent,
          fontSize: 12,
          margin: [0, 2, 0, 2]
        }))
        content.push({
          ul: items,
          margin: [0, 5, 0, 5]
        })
        break
      case 'BLOCKQUOTE':
        content.push({
          text: node.textContent,
          fontSize: 12,
          margin: [30, 5, 0, 5],
          color: '#666666',
          italics: true
        })
        break
    }
  }

  Array.from(div.children).forEach(processNode)
  return content
}

// 动态导入 pdfMake
let pdfMakeX = null;

const initPdfMake = async () => {
  if (!pdfMakeX) {
    const pdfMakeModule = await import('pdfmake/build/pdfmake');
    const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
    
    pdfMakeX = pdfMakeModule.default;
    pdfMakeX.vfs = pdfFontsModule.default.pdfMake.vfs;
    
    // 配置字体
    pdfMakeX.fonts = {
      Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf'
      }
    };
  }
  return pdfMakeX;
};

// 确保 MathJax 加载
const loadMathJax = async () => {
  if (!window.MathJax?.typesetPromise) {
    await import('mathjax/es5/tex-mml-chtml.js');
  }
}

function App() {
  const [text, setText] = useState('')
  const [isExporting, setIsExporting] = useState(false)

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

  const handleExportPDF = async () => {
    try {
      setIsExporting(true)

      // 创建打印窗口
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        throw new Error('请允许弹出窗口以打印')
      }

      // 写入打印内容
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Markdown Export</title>
            <meta charset="UTF-8">
            <style>
              @page {
                size: A4;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                background: #ccc;
              }
              .page {
                width: 210mm;
                min-height: 297mm;
                padding: 30mm 20mm;  /* 增加上下内边距到 30mm */
                margin: 10mm auto;
                background: white;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
              }
              .content {
                font-size: 12pt;
                line-height: 1.6;
                max-width: 170mm;  /* 限制内容宽度 */
                margin: 0 auto;    /* 内容居中 */
              }
              @media print {
                body {
                  background: none;
                }
                .page {
                  width: 210mm;
                  min-height: 297mm;
                  padding: 30mm 20mm;  /* 打印时保持相同的内边距 */
                  margin: 0;
                  box-shadow: none;
                  break-after: page;
                }
                .content {
                  font-family: "Microsoft YaHei", sans-serif;
                }
              }
              /* 保留原有样式 */
              ${document.querySelector('style')?.innerHTML || ''}
              /* 打印时隐藏页边距指示器 */
              @media print {
                .page::after {
                  display: none;
                }
              }
              /* 数学公式样式调整 */
              .math-display {
                overflow-x: auto;
                margin: 1em 0;
                text-align: center;
              }
              /* 代码块样式 */
              pre {
                background-color: #f5f5f5;
                padding: 1em;
                border-radius: 4px;
                overflow-x: auto;
                font-size: 0.9em;
              }
              /* 图片最大宽度 */
              img {
                max-width: 100%;
                height: auto;
              }
            </style>
            <script>
              window.MathJax = {
                tex: {
                  inlineMath: [['$', '$']],
                  displayMath: [['$$', '$$']],
                  processEscapes: true,
                  processEnvironments: true,
                },
                options: {
                  skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
                },
                startup: {
                  pageReady: () => {
                    return MathJax.startup.defaultPageReady().then(() => {
                      console.log('MathJax initial typesetting complete');
                    });
                  }
                }
              };
            </script>
            <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
          </head>
          <body>
            <div class="page">
              <div class="content">
                ${document.querySelector('.preview-content').innerHTML}
              </div>
            </div>
          </body>
        </html>
      `)

      // 等待新窗口中的 MathJax 加载和渲染
      await new Promise((resolve) => {
        const checkMathJax = () => {
          if (printWindow.MathJax?.startup?.pageReady) {
            printWindow.MathJax.startup.pageReady()
              .then(resolve)
              .catch(resolve)
          } else {
            setTimeout(checkMathJax, 100)
          }
        }
        checkMathJax()
      })

      // 等待图片加载完成
      await Promise.all(
        Array.from(printWindow.document.images).map(
          img => new Promise((resolve) => {
            if (img.complete) {
              resolve()
            } else {
              img.onload = resolve
              img.onerror = resolve
            }
          })
        )
      )

      // 触发打印
      printWindow.document.close()
      printWindow.focus()

      setTimeout(() => {
        printWindow.print()
        setIsExporting(false)  // 在打印对话框出现时就恢复按钮状态
        
        toast.info('请在打印对话框中选择"另存为 PDF"', {
          position: 'top-center',
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        })
      }, 1000)

    } catch (error) {
      console.error('打印错误:', error)
      toast.error(error.message || '打印失败，请重试')
      setIsExporting(false)  // 错误时恢复按钮状态
    }
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
        <div className="button-group">
          <button onClick={handleCopy} className="action-button">
            复制转换后的文本
          </button>
          <button 
            onClick={handleExportPDF} 
            className="action-button"
          >
            打印页面
          </button>
        </div>
      </div>
      <ToastContainer />
    </div>
  )
}

export default App
