import {
  Component,
  ViewEncapsulation,
  OnInit,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  Input,
} from '@angular/core';

import * as d3 from 'd3';

@Component({
  selector: 'app-line-chart',
  encapsulation: ViewEncapsulation.None,

  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.scss'],
})
export class LineChartComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() data!: any;
  @Input() comWidth: number = 900;
  @Input() comHeight: number = 500;
  title = 'Line Chart';
  tooltip: any;
  margin = { top: 20, right: 0, bottom: 50, left: 50 };
  width: number;
  height: number;
  x: any;
  y: any;
  svg: any;
  line?: d3.Line<[number, number]>;
  line2?: d3.Line<[number, number]>;
  xAxis: any;
  yAxis: any;
  chartContainer: any;
  g: any;
  pointer: any = {};
  svgLine: any;
  svgLine2: any;
  svgCandle: any;
  svgBar: any;
  point!: number;
  currentData: any;
  svgBollinger: any;
  verticalLine: any;
  horizontalLine: any;
  rect: any;
  formatDate = d3.utcFormat('%B %-d, %Y');
  formatValue = d3.format('.2f');
  formatChange = (y0: number, y1: number) => {
    const f = d3.format('+.2%');
    return f((y1 - y0) / y0);
  };
  visible = [false, false, false];

  constructor() {
    this.width = this.comWidth - this.margin.left - this.margin.right;
    this.height = this.comHeight - this.margin.top - this.margin.bottom;
  }

  ngOnInit() {}
  ngOnChanges(changes: SimpleChanges): void {
    this.setShowData();
    this.initSvg();

    this.drawChart();

    this.visibleChanges('candle');
  }
  ngAfterViewInit(): void {}

  drawChart() {
    this.initAxis();

    this.drawAxis();
    this.drawLine();
    this.initZoom();
    this.initTooltip();
    this.pointerInit();
    this.initDrag();
  }
  initSvg() {
    //svg
    this.svg = d3.select('#svg');
    this.svg
      .attr('width', this.comWidth)
      .attr('height', this.comHeight)
      .style('pointer-events', 'none');
    this.g = this.svg
      .append('g')
      .attr(
        'transform',
        'translate(' + this.margin.left + ',' + this.margin.top + ')'
      );
    this.rect = this.g
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this.width)
      .attr('height', this.height)
      .style('fill', 'none')
      .style('pointer-events', 'all');

    this.chartContainer = this.g
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .append('g')
      .attr('class', 'chart-container');

    //Axis
    this.g
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height + this.margin.bottom)
      .append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', 'translate(0,' + this.height + ')');
    this.g
      .append('g')
      .attr('class', 'axis axis--y')
      .append('text')
      .attr('class', 'axis-title')
      .attr('transform', 'rotate(-90)')
      .attr('y', 6)
      .attr('dy', '.71em')
      .style('text-anchor', 'end')
      .text('Price ($)');

    //bollinger && line
    this.svgBollinger = this.chartContainer.append('g');

    this.svgBollinger
      .append('clipPath')
      .attr('id', 'clipPathGreen')
      .append('path')
      .attr('class', 'clipPathGreen');
    this.svgBollinger
      .append('clipPath')
      .attr('id', 'clipPathRed')
      .append('path')
      .attr('class', 'clipPathRed');

    this.svgLine2 = this.svgBollinger.append('path').attr('class', 'line');
    this.svgBollinger.append('path').attr('class', 'redPath');
    this.svgBollinger.append('path').attr('class', 'greenPath');
    this.svgCandle = this.chartContainer.append('g').attr('id', 'candle');
    this.svgCandle.append('g');

    this.svgBar = this.chartContainer
      .append('svg')
      .attr('viewBox', [0, 0, this.width, this.height])
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('style', 'max-width: 100%; height: auto;');
    // .attr('stroke', 'black');
    this.svgLine = this.chartContainer
      .append('g')
      .attr('id', 'line')
      .append('path')
      .attr('class', 'line');

    //tooltip
    this.tooltip = this.svg.append('g');

    //pointer
    this.verticalLine = this.svg
      .append('line')
      .attr('class', 'verticalLine')
      .attr('y1', 0)
      .attr('y2', this.height)
      .attr('stroke', 'black')
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '5,5')
      .attr('transform', 'translate(0,' + this.margin.top + ')');

    this.horizontalLine = this.svg
      .append('line')
      .attr('class', 'horizontalLine')
      .attr('x1', 0)
      .attr('x2', this.width)
      .attr('stroke', 'black')
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '5,5')
      .attr('transform', 'translate(' + this.margin.left + ', 0)');
  }

  nextDate(date: Date) {
    const ndate = new Date(date);
    ndate.setDate(ndate.getDate() + 1);
    return ndate;
  }

  setShowData() {
    if (!!this.point) {
      this.currentData = this.data.slice(
        Math.max(this.point - 50, 0),
        Math.min(this.data.length + 50, this.data.length)
      );
    } else
      this.currentData = this.data.slice(Math.max(this.data.length - 100, 0));
    console.log(this.currentData);
  }

  initAxis() {
    this.x = d3.scaleTime().range([0, this.width]);

    // this.x = D3.scaleBand()
    //   .domain(D3.sort(this.data, (d) => -d.CLOSE).map((d) => d.date.toISOString()))
    //   .range([this.margin.left, this.width])
    //   .padding(0.1);

    let low = d3.min(this.currentData, (d: any) => parseInt(d.LOW));

    let high = d3.max(this.currentData, (d: any) => parseInt(d.HIGH));
    this.y = d3
      .scaleLinear()
      .domain([low ? low : 0, high ? high : 0])
      .rangeRound([this.height, 0]);

    this.x.domain(
      d3.extent(this.currentData, (d: any) => {
        return d.date;
      })
    );
  }

  drawAxis() {
    this.xAxis = d3.axisBottom(this.x);
    this.xAxis.ticks(5);

    // this.xAxis.style('transform', 'rotate(-45deg)');
    this.xAxis.tickFormat(d3.timeFormat('%d/%m/%Y'));

    this.g.select('.axis--x').call(this.xAxis);
    this.g.select('.axis--x');
    // .selectAll('text')
    // .attr('transform', 'translate(10,0)rotate(45)')
    // .style('text-anchor', 'start');
    this.yAxis = d3.axisLeft(this.y);

    this.g.select('.axis--y').call(this.yAxis);
  }

  drawLine() {
    // const area = d3
    //   .area()
    //   .x((d: any) => this.x(d.date))
    //   .y0((d: any) => this.y(d.OPEN > d.CLOSE ? d.CLOSE : d.OPEN))
    //   .y1((d: any) => this.y(d.OPEN < d.CLOSE ? d.CLOSE : d.OPEN));
    const areaGreen = d3
      .area()
      .defined((d: any) => !isNaN(d.OPEN))
      .x((d: any) => this.x(d.date))
      .y(0)
      .y1((d: any) => this.y(d.OPEN));

    this.svgBollinger
      .select('.clipPathGreen')
      .datum(this.currentData)
      .attr('d', areaGreen);

    const areaRed = d3
      .area()
      .defined((d: any) => !isNaN(d.OPEN))
      .x((d: any) => this.x(d.date))
      .y(this.height)
      .y1((d: any) => this.y(d.OPEN));

    this.svgBollinger
      .select('.clipPathRed')
      .datum(this.currentData)
      .attr('fill', 'lightsteelblue')
      .attr('d', areaRed);
    // .attr('opacity', 0.3);

    this.line2 = d3
      .line()
      .x((d: any) => this.x(d.date))
      .y((d: any) => this.y(d.OPEN));

    this.svgLine2
      .datum(this.currentData)
      .attr('d', this.line2)
      .style('stroke-width', 2);

    let areaFillRed = d3
      .area()
      .defined((d: any) => !isNaN(d.OPEN) && !!d.OPEN)
      .defined((d: any) => !isNaN(d.CLOSE) && !!d.CLOSE)
      .x((d: any) => this.x(d.date))
      .y0((d: any) => this.y(d.OPEN))
      .y1((d: any) => this.y(d.CLOSE));

    this.svgBollinger
      .select('.redPath')
      .attr('clip-path', `url(#clipPathRed)`)
      .datum(this.currentData)
      .attr('fill', '#ebc2af')
      .attr('d', areaFillRed);

    let areaFillGreen = d3
      .area()
      .defined((d: any) => !isNaN(d.OPEN))
      .defined((d: any) => !isNaN(d.CLOSE))
      .x((d: any) => this.x(d.date))
      .y0((d: any) => this.y(d.CLOSE))
      .y1((d: any) => this.y(d.OPEN));

    this.svgBollinger
      .select('.greenPath')
      .attr('clip-path', `url(#clipPathGreen)`)
      .datum(this.currentData)
      .attr('fill', '#ace1af')
      .attr('d', areaFillGreen);

    //candle
    this.svgCandle.selectAll('g').remove();
    let x = this.svgCandle
      .append('g')
      .attr('class', 'line')
      .attr('stroke', 'black')
      .selectAll('g')
      .data(this.currentData)
      .join('g')
      .attr(
        'transform',
        (d: any) => `translate(${this.x(d.date) ? this.x(d.date) : 0},0)`
      )
      .attr('stroke', (d: any) =>
        d.OPEN > d.CLOSE
          ? d3.schemeSet1[0]
          : d.CLOSE > d.OPEN
          ? d3.schemeSet1[2]
          : d3.schemeSet1[8]
      );

    // this.svgCandle = this.chartContainer
    //   .append('g')
    //   .attr('class', 'line')
    //   .attr('stroke', 'black')
    //   .selectAll('g')
    //   .data(this.currentData)
    //   .join('g')
    //   .attr(
    //     'transform',
    //     (d: any) => `translate(${this.x(d.date) ? this.x(d.date) : 0},0)`
    //   )
    //   .attr('stroke', (d: any) =>
    //     d.OPEN > d.CLOSE
    //       ? d3.schemeSet1[0]
    //       : d.CLOSE > d.OPEN
    //       ? d3.schemeSet1[2]
    //       : d3.schemeSet1[8]
    //   );

    x.append('line')
      .attr('class', 'low-high')
      .attr('y1', (d: any) => this.y(d.LOW))
      .attr('y2', (d: any) => this.y(d.HIGH));

    x.append('line')
      .attr('class', 'open-close')
      .attr('y1', (d: any) => this.y(d.OPEN))
      .attr('y2', (d: any) => this.y(d.CLOSE))
      .attr('stroke-width', 4);

    //lineChart
    this.line = d3
      .line()
      // .defined((point: any) => !isNaN(point.date))
      // .defined((point: any) => !isNaN(point.CLOSE))
      .x((d: any) => this.x(d.date))
      .y((d: any) => this.y(d.CLOSE));
    this.svgLine
      .datum(this.currentData)
      .attr('d', this.line)
      .style('stroke-width', 3);

    //Bar Chart

    let low = d3.min(this.currentData, (d: any) => parseInt(d.LOW));
    this.svgBar.select('g').remove();

    this.svgBar
      .append('g')
      .attr('class', 'bars')
      .attr('fill', 'steelblue')
      .selectAll('rect')
      .data(this.currentData)
      .join('rect')
      .attr('x', (d: any) => this.x(d.date))
      .attr('y', (d: any) => this.y(low! + Math.abs(d.OPEN - d.CLOSE)))
      .attr(
        'height',
        (d: any) => this.y(0) - this.y(Math.abs(d.OPEN - d.CLOSE))
      )
      .attr('width', 5);
  }

  initZoom() {
    const extent: [[number, number], [number, number]] = [
      [this.margin.left, this.margin.top],
      [this.width + this.margin.left, this.height + this.margin.top],
    ];
    const bisect = d3.bisector((d: any) => d.date).center;
    this.g.call(
      d3
        .zoom()
        .scaleExtent([0.5, 5])
        .translateExtent(extent)
        .extent(extent)
        .on('zoom', (event) => {
          // let { k: mk, x: mx } = event.transform;

          // this.x.range([0, this.width].map((d) => event.transform.applyX(d)));

          // let low = d3.min(this.currentData, (d: any) => parseInt(d.LOW));

          // let high = d3.max(this.currentData, (d: any) => parseInt(d.HIGH));
          // // this.y = d3
          // //   .scaleLog()
          // //   .domain([low ? low : 0, high ? high : 0])
          // //   .rangeRound([this.height, 0]);
          // this.y.range([this.height, 0].map((d) => event.transform.applyY(d)));

          // this.yAxis = d3.axisLeft(this.y);
          // this.g.select('.axis--x').call(this.xAxis.scale(this.x));

          // this.g.select('.axis--y').call(this.yAxis.scale(this.y));
          // this.chartContainer.attr('transform', event.transform);
          const min = bisect(this.data, this.x.invert(0));
          const max = bisect(this.data, this.x.invert(this.width));

          this.currentData = this.data.slice(min, max);

          // this.drawChart();
        })
    );
  }

  initTooltip() {
    const data = this.currentData;
    const x = this.x;
    const y = this.y;
    const line = this.line;
    const margin = this.margin;
    const svg = this.svg;
    const height = this.height;
    const width = this.width;
    const nextDate = this.nextDate;

    const tooltip = this.tooltip;
    function formatValue(value: any) {
      return value.toLocaleString('vi-VN', {
        style: 'currency',
        currency: 'Đồng',
      });
    }

    function formatDate(date: any) {
      const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      };

      const formatter = new Intl.DateTimeFormat('vi-VN', options);
      return formatter.format(date);
    }

    // Add the event listeners that show or hide the tooltip.
    const bisect = d3.bisector((d: any) => d.date).center;

    function pointerleft() {
      tooltip.style('display', 'none');
    }

    // Wraps the text with a callout path of the correct size, as measured in the page.
    function size(text: any, path: any) {
      const { x, y, width: w, height: h } = text.node().getBBox();
      text.attr('transform', `translate(${-w / 2},${15 - y})`);
      path.attr(
        'd',
        `M${-w / 2 - 10},5H-5l5,-5l5,5H${w / 2 + 10}v${h + 20}h-${w + 20}z`
      );
    }

    function candlePointer(event: any) {
      console.log('can');

      const i = bisect(data, x.invert(d3.pointer(event)[0]));

      tooltip.style('display', null);
      tooltip.attr(
        'transform',
        `translate(${d3.pointer(event)[0] + margin.left},${
          d3.pointer(event)[1] + margin.top
        })`
      );

      const path = tooltip
        .selectAll('path')
        .data([,])
        .join('path')
        .attr('fill', 'white')
        .attr('stroke', 'black');

      const candleText = tooltip
        .selectAll('text')
        .data([,])
        .join('text')
        .call((text: any) =>
          text
            .selectAll('tspan')
            .data([
              `Ngày: ${formatDate(nextDate(data[i].date))}`,
              `Phiên mở: ${formatValue(data[i].OPEN)}`,
              `Phiên đóng: ${formatValue(data[i].CLOSE)}`,
            ])
            .join('tspan')
            .attr('x', 0)
            .attr('y', (_: any, i: number) => `${i * 1.1}em`)
            .attr('font-weight', (_: any, i: number) => (i ? null : 'bold'))
            .text((d: any) => d)
        );

      size(candleText, path);
    }

    function linePointer(event: any) {
      console.log('line');

      const i = bisect(data, x.invert(d3.pointer(event)[0]));

      tooltip.style('display', null);
      tooltip.attr(
        'transform',
        `translate(${d3.pointer(event)[0] + margin.left},${
          d3.pointer(event)[1] + margin.top
        })`
      );

      const path = tooltip
        .selectAll('path')
        .data([,])
        .join('path')
        .attr('fill', 'white')
        .attr('stroke', 'black');

      const candleText = tooltip
        .selectAll('text')
        .data([,])
        .join('text')
        .call((text: any) =>
          text
            .selectAll('tspan')
            .data([
              `Ngày: ${formatDate(nextDate(data[i].date))}`,
              `Phiên mở: ${formatValue(data[i].OPEN)}`,
              `Phiên đóng: ${formatValue(data[i].CLOSE)}`,
            ])
            .join('tspan')
            .attr('x', 0)
            .attr('y', (_: any, i: number) => `${i * 1.1}em`)
            .attr('font-weight', (_: any, i: number) => (i ? null : 'bold'))
            .text((d: any) => d)
        );

      size(candleText, path);
    }

    function bollingerPointer(event: any) {
      console.log('bol');

      const i = bisect(data, x.invert(d3.pointer(event)[0]));

      tooltip.style('display', null);
      tooltip.attr(
        'transform',
        `translate(${d3.pointer(event)[0] + margin.left},${
          d3.pointer(event)[1] + margin.top
        })`
      );

      const path = tooltip
        .selectAll('path')
        .data([,])
        .join('path')
        .attr('fill', 'white')
        .attr('stroke', 'black');

      const candleText = tooltip
        .selectAll('text')
        .data([,])
        .join('text')
        .call((text: any) =>
          text
            .selectAll('tspan')
            .data([
              `Ngày: ${formatDate(nextDate(data[i].date))}`,
              `Phiên mở: ${formatValue(data[i].OPEN)}`,
              `Phiên đóng: ${formatValue(data[i].CLOSE)}`,
            ])
            .join('tspan')
            .attr('x', 0)
            .attr('y', (_: any, i: number) => `${i * 1.1}em`)
            .attr('font-weight', (_: any, i: number) => (i ? null : 'bold'))
            .text((d: any) => d)
        );

      size(candleText, path);
    }
    // this.svg
    //   .on('pointerenter pointermove', pointermoved)
    //   .on('pointerleave', pointerleft)
    //   .on('touchstart', (event: any) => event.preventDefault());
    this.svgCandle
      .on('pointerenter pointermove', candlePointer)
      .on('pointerleave', pointerleft)
      .on('touchstart', (event: any) => event.preventDefault());
    this.svgCandle.style('pointer-events', 'all');
    this.svgLine
      .on('pointerenter pointermove', linePointer)
      .on('pointerleave', pointerleft)
      .on('touchstart', (event: any) => event.preventDefault());
    this.svgLine.style('pointer-events', 'all');
    // this.svgBollinger
    //   .on('pointerenter pointermove', bollingerPointer)
    //   .on('pointerleave', pointerleft)
    //   .on('touchstart', (event: any) => event.preventDefault());
    // this.svgBollinger.style('pointer-events', 'all');
  }

  pointerInit() {
    const formatTime = d3.timeFormat('%d/%m/%y');

    const bisect = d3.bisector((d: any) => d.date).center;
    // Bắt sự kiện di chuyển chuột
    this.svg.on('mousemove', (event: any) => {
      const [x, y] = d3.pointer(event);
      // const [a, b] = d3.pointer(event);
      // const [x, y] = [a + marginV, b];

      this.verticalLine.attr('x1', x).attr('x2', x);
      // Cập nhật vị trí đường kẻ ngang
      this.horizontalLine.attr('y1', y).attr('y2', y);
      const xx = bisect(this.currentData, this.x.invert(x - this.margin.left));

      const date = formatTime(this.currentData[xx].date);
      this.pointer = {
        x: date,
        y: this.y.invert(y).toFixed(2),
      };
    });
  }

  initDrag() {
    // this.rect.on('mousedown', (event: any) => {
    //   console.log(event);
    // });
    let rect = this.rect;
    let data = this.data;
    let x = this.x;
    let width = this.width;

    // Chọn phần tử cần kéo thả và áp dụng tính năng kéo thả
    function dragStarted(event: any) {
      startX = event.x;
    }
    let dragged = (event: any) => {
      const deltaX = event.x - startX;
      // chartContainer.attr('transform', `translate(${deltaX}, 0)`);
      const bisect = d3.bisector((d: any) => d.date).center;

      let min = bisect(data, x.invert(-deltaX));
      let max = bisect(data, x.invert(width - deltaX));
      if (max == this.data.length - 1) min = this.data.length - 100;
      if (min == 0) max = 100;

      this.currentData = data.slice(min, max);

      this.drawChart();
    };

    function dragEnded(event: any) {
      // console.log(event);
    }

    const drag = d3
      .drag()
      .on('start', dragStarted)
      .on('drag', dragged)
      .on('end', dragEnded);
    rect.call(drag);
    let startX: number;
    // Các hàm xử lý sự kiện khi bắt đầu, kéo và kết thúc kéo
  }

  visibleChanges(x: string) {
    switch (x) {
      case 'line':
        this.visible[0] = !this.visible[0];
        // if (this.visible[0]) {
        //   this.svgLine.attr('display', 'unset');
        // } else this.svgLine.attr('display', 'none');
        break;
      case 'candle':
        this.visible[1] = !this.visible[1];
        // if (this.visible[0]) {
        //   this.svgCandle.attr('display', 'unset');
        // } else this.svgCandle.attr('display', 'none');
        break;
      case 'test':
        this.visible[2] = !this.visible[2];
        // if (this.visible[0]) {
        //   this.svgBollinger.attr('display', 'unset');
        // } else this.svgBollinger.attr('display', 'none');
        break;
    }

    let arr = [this.svgLine, this.svgCandle, this.svgBollinger];
    this.visible.forEach((check, index) => {
      if (!!check) {
        arr[index].attr('display', 'unset');
      } else arr[index].attr('display', 'none');
    });
  }
}
