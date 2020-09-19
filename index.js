const { Plugin } = require('powercord/entities')

module.exports = class AudioViz extends Plugin {
  startPlugin () {
    setTimeout(() => {
      this.intervals = []
      this.startVisualizer()
      this.loadStylesheet('style.scss')
    }, 0)
  }

  reload () {
    this.stopVisualizer()
    this.startVisualizer()
  }

  pluginWillUnload() {
    this.stopVisualizer()
  }

  stopVisualizer () {
      clearInterval(this.interval)
      cancelAnimationFrame(this.frame)
      const filter = document.getElementById('vp-audioviz-goo');
      const viz = document.getElementById('vp-audioviz-visualizer');
      filter.parentNode.removeChild(filter);
      viz.parentNode.removeChild(viz);
  }

  startVisualizer () {
    const { desktopCapturer } = require('electron')
    desktopCapturer.getSources({ types: ['window', 'screen'] }).then(async () => {
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
      let visualizer = document.createElement('div')
      visualizer.classList.add('vp-audioviz-visualizer')
      visualizer.id = 'vp-audioviz-visualizer'
      for (let i = 0; i < barCount; i++) {
        let bar = document.createElement('div')
        bar.classList.add('vp-audioviz-bar')
        bar.style.height = "100%";
        visualizer.appendChild(bar)
      }
      const visualizerGoo = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      visualizerGoo.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns', 'http://www.w3.org/2000/svg')
      visualizerGoo.setAttributeNS('http://www.w3.org/2000/version/', 'version', '1.1')
      visualizerGoo.classList.add('vp-audioviz-goo')
      visualizerGoo.id = 'vp-audioviz-goo'
      visualizerGoo.innerHTML = `
        <filter id="vpVisualizerGoo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur"></feGaussianBlur>
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="vpVisualizerGoo"></feColorMatrix>
          <feComposite in="SourceGraphic" in2="vpVisualizerGoo" operator="atop"></feComposite>
        </filter>
      `

      const findElement = setInterval(() => {
        if (accountContainer) {
          visualizer = document.querySelector('.vp-audioviz-visualizer')
        } else {
          accountContainer = document.querySelector('.panels-j1Uci_ > .container-3baos1:last-child')
          if (accountContainer) {
            accountContainer.prepend(visualizer)
            accountContainer.prepend(visualizerGoo)
          }
        }
      }, 1000)
      const func = () => {
        if (!visualizer) return
        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        analyser.getByteFrequencyData(dataArray)

        for (let i = 0; i < barCount; i++) {
          const y = dataArray[i * 2]
          const height = easeInOutCubic(Math.min(1, y / 255)) * 100 + 50
          const bar = visualizer.children[i]
          bar.style.transform = `scale(1, ${height / 50})`;
        }
        requestAnimationFrame(func)
      }
      const style = requestAnimationFrame(func)
      this.interval = findElement;
      this.frame = style
    }).catch(error => {
      console.error('An error occurred getting media sources', error)
    })
  }
}
