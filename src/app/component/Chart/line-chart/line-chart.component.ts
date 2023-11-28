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
  margin = { top: 20, right: 20, bottom: 30, left: 50 };
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
  point!: number;
  currentData: any;
  svgBollinger: any;
  verticalLine: any;
  horizontalLine: any;
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
    let rect = this.g
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
    this.chartContainer
      .append('clipPath')
      .attr('id', 'clipPathGreen')
      .append('path')
      .attr('class', 'clipPathGreen');
    this.chartContainer
      .append('clipPath')
      .attr('id', 'clipPathRed')
      .append('path')
      .attr('class', 'clipPathRed');
    this.svgBollinger = this.chartContainer.append('g');

    this.svgLine2 = this.svgBollinger.append('path').attr('class', 'line');
    this.svgBollinger.append('path').attr('class', 'redPath');
    this.svgBollinger.append('path').attr('class', 'greenPath');
    this.svgCandle = this.chartContainer
      .append('g')
      .attr('class', 'line')
      .attr('stroke', 'black');
    this.svgLine = this.chartContainer
      .append('path')
      .attr('class', 'line')
      .attr('id', 'line');
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
      .scaleLog()
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

    this.g.select('.axis--x').call(this.xAxis);

    this.yAxis = d3.axisLeft(this.y);

    this.g.select('.axis--y').call(this.yAxis);
  }

  drawLine() {
    this.line = d3
      .line()
      // .defined(point => !isNaN(point.y))
      .x((d: any) => this.x(d.date))
      .y((d: any) => this.y(d.CLOSE));

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

    this.chartContainer
      .select('.clipPathGreen')
      .datum(this.currentData)
      .attr('d', areaGreen);

    const areaRed = d3
      .area()
      .defined((d: any) => !isNaN(d.OPEN))
      .x((d: any) => this.x(d.date))
      .y(this.height)
      .y1((d: any) => this.y(d.OPEN));

    this.chartContainer
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
    this.svgCandle.remove();
    this.svgCandle = this.chartContainer
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

    this.svgCandle
      .append('line')
      .attr('class', 'low-high')
      .attr('y1', (d: any) => this.y(d.LOW))
      .attr('y2', (d: any) => this.y(d.HIGH));

    this.svgCandle
      .append('line')
      .attr('class', 'open-close')
      .attr('y1', (d: any) => this.y(d.OPEN))
      .attr('y2', (d: any) => this.y(d.CLOSE))
      .attr('stroke-width', 4);

    this.chartContainer
      .select('#line')
      .datum(this.currentData)
      .attr('d', this.line)
      .style('stroke-width', 3);
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
        .scaleExtent([0.8, 1.5])
        .translateExtent(extent)
        .extent(extent)
        .on('zoom', (event) => {
          let { k: mk, x: mx } = event.transform;

          this.x.range([0, this.width].map((d) => event.transform.applyX(d)));

          const min = bisect(this.data, this.x.invert(0));
          const max = bisect(this.data, this.x.invert(this.width));

          this.currentData = this.data.slice(min, max);
          console.log(mk, mx, min, max, this.currentData);

          // let low = d3.min(this.currentData, (d: any) => parseInt(d.LOW));

          // let high = d3.max(this.currentData, (d: any) => parseInt(d.HIGH));
          // this.y = d3
          //   .scaleLog()
          //   .domain([low ? low : 0, high ? high : 0])
          //   .rangeRound([this.height, 0]);
          // this.yAxis = d3.axisLeft(this.y);
          // this.g.select('.axis--x').call(this.xAxis.scale(this.x));

          // this.g.select('.axis--y').call(this.yAxis);
          this.drawChart();
          // this.chartContainer.attr('transform', event.transform);
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
      return value.toLocaleString('en', {
        style: 'currency',
        currency: 'USD',
      });
    }

    function formatDate(date: any) {
      return date.toLocaleString('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
    }

    // Add the event listeners that show or hide the tooltip.
    const bisect = d3.bisector((d: any) => d.date).center;
    function pointermoved(event: any) {
      const i = bisect(data, x.invert(d3.pointer(event)[0] - margin.left));
      tooltip.style('display', null);
      tooltip.attr(
        'transform',
        `translate(${x(data[i].date) + margin.left},${
          y(data[i].CLOSE) + margin.top
        })`
      );

      const path = tooltip
        .selectAll('path')
        .data([,])
        .join('path')
        .attr('fill', 'white')
        .attr('stroke', 'black');

      const text = tooltip
        .selectAll('text')
        .data([,])
        .join('text')
        .call((text: any) =>
          text
            .selectAll('tspan')
            .data([
              formatDate(nextDate(data[i].date)),
              formatValue(data[i].CLOSE),
            ])
            .join('tspan')
            .attr('x', 0)
            .attr('y', (_: any, i: number) => `${i * 1.1}em`)
            .attr('font-weight', (_: any, i: number) => (i ? null : 'bold'))
            .text((d: any) => d)
        );

      size(text, path);
    }

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
    this.svg
      .on('pointerenter pointermove', pointermoved)
      .on('pointerleave', pointerleft)
      .on('touchstart', (event: any) => event.preventDefault());
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
