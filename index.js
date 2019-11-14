const { Plugin } = require('powercord/entities')
const { resolve } = require('path')

module.exports = class AudioViz extends Plugin {
  startPlugin () {
    this.intervals = this.startVisualizer()
    this.loadCSS(resolve(__dirname, 'style.scss'))
  }

  reload () {
    this.stopVisualizer()
    this.startVisualizer()
  }

  stopVisualizer () {
    for (const interval of this.intervals) {
      clearInterval(interval)
    }
  }

  startVisualizer () {
    const { desktopCapturer } = require('electron')
    desktopCapturer.getSources({ types: [ 'window', 'screen' ] }).then(async sources => {
      for (const source of sources) {
        if (source.name.includes('Discord')) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                mandatory: {
                  chromeMediaSource: 'desktop'
                }
              },
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop'
                }
              }
            })

            const audioCtx = new AudioContext()
            const audio = audioCtx.createMediaStreamSource(stream)
            const easeInOutCubic = t => t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1
            const barCount = 20

            const analyser = audioCtx.createAnalyser()
            audio.connect(analyser)
            analyser.fftSize = 1024
            let accountContainer
            let visualizer = document.createElement('canvas')
            let ctx = visualizer.getContext('2d')
            visualizer.classList.add('vp-audioviz-visualizer')

            const findElement = setInterval(() => {
              if (accountContainer) {
                visualizer = document.querySelector('.vp-audioviz-visualizer')
              } else {
                accountContainer = document.querySelector('.pc-panels > .pc-container:last-child')
                if (accountContainer) {
                  accountContainer.prepend(visualizer)
                }
              }
              if (visualizer) {
                visualizer.height = visualizer.clientHeight
                visualizer.width = visualizer.clientWidth
                ctx = visualizer.getContext('2d')
              }
            }, 1000)

            const style = setInterval(() => {
              if (!visualizer) return
              const bufferLength = analyser.frequencyBinCount
              const dataArray = new Uint8Array(bufferLength)
              analyser.getByteFrequencyData(dataArray)
              const xStep = visualizer.width / (barCount - 1)
              const data = []
              let i
              for (i = 0; i < barCount; i++) {
                data.push(Math.round(easeInOutCubic(Math.min(1, dataArray[i * 2] / 255)) * visualizer.height))
              }
              ctx.fillStyle = '#292b2f'
              ctx.fillRect(0, 0, visualizer.width, visualizer.height)

              ctx.beginPath()
              ctx.moveTo(0, data[0])
              for (i = 1; i < data.length - 2; i++) {
                const x = xStep * i
                ctx.quadraticCurveTo(x, data[i], x + xStep * .5, (data[i + 1] + data[i]) / 2);
              }
              ctx.quadraticCurveTo(xStep * i, data[i], xStep * (i + .5), (data[i + 1] + data[i]) / 2)
              ctx.lineTo(xStep * ++i, data[i])
              ctx.lineTo(visualizer.width, visualizer.height)
              ctx.lineTo(0, visualizer.height)
              ctx.fillStyle = '#7289da'
              ctx.fill()
            }, 20)
            this.intervals = [ style, findElement ]
          } catch (e) {
            console.error(e)
          }
          return
        }
      }
    })
  }
}
