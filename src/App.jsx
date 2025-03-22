import { useState, useRef } from 'react'
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
  const editorRef = useRef(null)
  const previewRef = useRef(null)
  const [lastScrollSource, setLastScrollSource] = useState(null);
  const [activePanel, setActivePanel] = useState(null);

  // 添加一个防抖定时器引用
  const scrollTimer = useRef(null);
  // 添加一个状态来存储待同步的位置
  const pendingSync = useRef(null);

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

  // 计算两个字符串的相似度
  const similarity = (s1, s2) => {
    if (s1.length < s2.length) [s1, s2] = [s2, s1]
    const distances = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(0))
    for (let i = 0; i <= s1.length; i++) distances[0][i] = i
    for (let j = 0; j <= s2.length; j++) distances[j][0] = j
    
    for (let j = 1; j <= s2.length; j++) {
      for (let i = 1; i <= s1.length; i++) {
        if (s1[i-1] === s2[j-1]) {
          distances[j][i] = distances[j-1][i-1]
        } else {
          distances[j][i] = Math.min(
            distances[j-1][i] + 1,   // 删除
            distances[j][i-1] + 1,   // 插入
            distances[j-1][i-1] + 1  // 替换
          )
        }
      }
    }
    return 1 - distances[s2.length][s1.length] / Math.max(s1.length, s2.length)
  }

  // 修改 findMatchingPosition 函数
  const findMatchingPosition = (source, target, sourcePos) => {
    const sourceText = source.value || source.textContent
    const targetText = target.value || target.textContent
    
    // 获取源文本从顶部到当前位置的内容
    const sourceTopContent = sourceText.substring(0, Math.floor(sourcePos / source.scrollHeight * sourceText.length))
    const paragraphs = sourceTopContent.split('\n\n')
    
    // 获取最后几个段落作为匹配内容
    const lastParagraphs = paragraphs.slice(-3).join('\n\n')
    
    // 在目标文本中查找匹配位置
    let bestMatch = 0
    let bestSimilarity = 0
    const targetParagraphs = targetText.split('\n\n')
    
    // 从头开始查找，确保顶部对齐
    for (let i = 0; i < targetParagraphs.length - 2; i++) {
      const targetSlice = targetParagraphs.slice(i, i + 3).join('\n\n')
      const currentSimilarity = similarity(lastParagraphs, targetSlice)
      
      if (currentSimilarity > bestSimilarity) {
        bestSimilarity = currentSimilarity
        // 计算匹配位置
        const precedingContent = targetParagraphs.slice(0, i).join('\n\n')
        bestMatch = (precedingContent.length / targetText.length) * target.scrollHeight
      }
    }
    
    // 如果没有找到好的匹配，使用简单的比例计算
    if (bestSimilarity < 0.3) {
      return (sourcePos / source.scrollHeight) * target.scrollHeight
    }
    
    return bestMatch
  }

  const handleMouseEnter = (panel) => () => {
    setActivePanel(panel);
  };

  // 修改滚动处理函数中的滚动行为
  const handleScroll = (source) => (e) => {
    const sourceElement = e.target;
    const sourceScrollTop = sourceElement.scrollTop;
    
    // 只在鼠标在源面板上时处理
    if (source === activePanel) {
      // 清除之前的定时器
      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current);
      }

      // 存储当前滚动位置和相关信息
      pendingSync.current = {
        source,
        sourceElement,
        sourceScrollTop
      };

      // 设置新的定时器，等待用户停止滚动
      scrollTimer.current = setTimeout(() => {
        // 用户已停止滚动，执行同步
        const { source, sourceElement, sourceScrollTop } = pendingSync.current;

        if (source === 'editor' && previewRef.current) {
          const previewElement = previewRef.current;
          const targetScrollTop = findMatchingPosition(
            sourceElement,
            previewElement,
            sourceScrollTop
          );
          
          previewElement.scrollTo({
            top: targetScrollTop,
            behavior: 'instant'  // 改为即时滚动，避免平滑滚动造成的延迟
          });
        }
        else if (source === 'preview' && editorRef.current) {
          const editorElement = editorRef.current;
          const targetScrollTop = findMatchingPosition(
            sourceElement,
            editorElement,
            sourceScrollTop
          );
          
          editorElement.scrollTo({
            top: targetScrollTop,
            behavior: 'instant'  // 改为即时滚动
          });
        }

        // 清除待同步信息
        pendingSync.current = null;
      }, 150);
    }
  };

  return (
    <div className="app-container">
      <div 
        className="editor"
        onMouseEnter={handleMouseEnter('editor')}
      >
        <textarea
          ref={editorRef}
          value={text}
          onChange={handleTextChange}
          onScroll={handleScroll('editor')}
          placeholder="在此输入Markdown文本..."
        />
      </div>
      <div 
        className="preview"
        onMouseEnter={handleMouseEnter('preview')}
      >
        <div 
          ref={previewRef}
          className="preview-content"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
          onScroll={handleScroll('preview')}
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
