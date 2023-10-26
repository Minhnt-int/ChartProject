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

  margin = { top: 20, right: 20, bottom: 30, left: 50 };
  width: number;
  height: number;
  x: any;
  y: any;
  svg: any;
  line?: d3.Line<[number, number]>;
  xAxis: any;
  yAxis: any;
  chartContainer: any;
  g: any;
  pointer: any = {};
  svgLine: any;
  svgCandle: any;
  visible = [true, true];

  constructor() {
    this.width = this.comWidth - this.margin.left - this.margin.right;
    this.height = this.comHeight - this.margin.top - this.margin.bottom;
  }

  ngOnInit() {}
  ngOnChanges(changes: SimpleChanges): void {
    this.initSvg();
    this.initAxis();
    this.drawAxis();
    this.drawLine();
    this.initZoom();
    this.initTooltip();
    this.pointerInit();
  }
  ngAfterViewInit(): void {}
  initSvg() {
    this.svg = d3.select('#svg');
    this.svg.attr('width', this.comWidth).attr('height', this.comHeight);
    this.g = this.svg
      .append('g')
      .attr(
        'transform',
        'translate(' + this.margin.left + ',' + this.margin.top + ')'
      );

    this.chartContainer = this.g.append('g').attr('class', 'chart-container');
  }

  initAxis() {
    this.x = d3.scaleTime().range([0, this.width]);
    // this.x = D3.scaleBand()
    //   .domain(D3.sort(this.data, (d) => -d.close).map((d) => d.date.toISOString()))
    //   .range([this.margin.left, this.width])
    //   .padding(0.1);
    let low = d3.min(this.data, (d: any) => d.low as number);
    let high = d3.max(this.data, (d: any) => d.high as number);
    this.y = d3
      .scaleLog()
      .domain([low ? low : 0, high ? high : 0])
      .rangeRound([this.height, this.margin.top]);
    this.x.domain(
      d3.extent(this.data, (d: any) => {
        return d.date;
      })
    );
  }

  drawAxis() {
    this.xAxis = d3.axisBottom(this.x);
    this.g
      .append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', 'translate(0,' + this.height + ')')
      .call(this.xAxis);

    this.yAxis = d3.axisLeft(this.y);
    this.g
      .append('g')
      .attr('class', 'axis axis--y')
      .call(this.yAxis)
      .append('text')
      .attr('class', 'axis-title')
      .attr('transform', 'rotate(-90)')
      .attr('y', 6)
      .attr('dy', '.71em')
      .style('text-anchor', 'end')
      .text('Price ($)');
  }

  drawLine() {
    this.line = d3
      .line()
      .x((d: any) => this.x(d.date))
      .y((d: any) => this.y(d.close));

    this.svgCandle = this.chartContainer
      .append('g')
      .attr('class', 'line')
      .attr('stroke-linecap', 'round')
      .attr('stroke', 'black')
      .selectAll('g')
      .data(this.data)
      .join('g')
      .attr(
        'transform',
        (d: any) => `translate(${this.x(d.date) ? this.x(d.date) : 0},0)`
      );

    this.svgCandle
      .append('line')
      .attr('y1', (d: any) => this.y(d.low))
      .attr('y2', (d: any) => this.y(d.high));

    this.svgCandle
      .append('line')
      .attr('y1', (d: any) => this.y(d.open))
      .attr('y2', (d: any) => this.y(d.close))
      .attr('stroke-width', 4)
      .attr('stroke', (d: any) =>
        d.open > d.close
          ? d3.schemeSet1[0]
          : d.close > d.open
          ? d3.schemeSet1[2]
          : d3.schemeSet1[8]
      );

    this.svgLine = this.chartContainer
      .append('path')
      .datum(this.data)
      .attr('class', 'line')
      .attr('d', this.line)
      .style('stroke-width', 3);
  }
  initZoom() {
    const extent: [[number, number], [number, number]] = [
      [this.margin.left, this.margin.top],
      [
        this.width + this.margin.right + this.margin.left,
        this.height + this.margin.bottom + this.margin.top,
      ],
    ];

    this.svg.call(
      d3
        .zoom()
        .scaleExtent([1, 8])
        .translateExtent(extent)
        .extent(extent)
        .on('zoom', (event) => {
          this.x.range([0, this.width].map((d) => event.transform.applyX(d)));
          this.g.select('.axis--x').call(this.xAxis);

          this.y.range([this.height, 0].map((d) => event.transform.applyY(d)));
          this.g.select('.axis--y').call(this.yAxis);
          this.chartContainer.attr('transform', event.transform);
        })
    );
  }

  initTooltip() {
    const data = this.data;
    const x = this.x;
    const y = this.y;
    const line = this.line;
    const margin = this.margin;
    const svg = this.svg;
    const height = this.height;
    const width = this.width;

    // if (line !== undefined)
    //   this.svg
    //     .append('path')
    //     .attr('fill', 'none')
    //     .attr('stroke', 'steelblue')
    //     .attr('stroke-width', 1.5)
    //     .attr('d', line(data))
    //     .attr(
    //       'transform',
    //       'translate(' + this.margin.left + ',' + this.margin.top + ')'
    //     );
    const tooltip = this.svg.append('g');

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
          y(data[i].close) + margin.top
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
            .data([formatDate(data[i].date), formatValue(data[i].close)])
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
    const svg = this.svg;
    const height = this.height;
    const width = this.width;
    const verticalLine = svg
      .append('line')
      .attr('class', 'verticalLine')
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', 'black')
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '5,5')
      .attr('transform', 'translate(0,' + this.margin.top + ')');

    const horizontalLine = svg
      .append('line')
      .attr('class', 'horizontalLine')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('stroke', 'black')
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '5,5')
      .attr('transform', 'translate(' + this.margin.left + ', 0)');

    const formatTime = d3.timeFormat('%d/%m/%y');

    const bisect = d3.bisector((d: any) => d.date).center;
    // Bắt sự kiện di chuyển chuột
    svg.on('mousemove', (event: any) => {
      const [x, y] = d3.pointer(event);
      console.log(y);

      verticalLine.attr('x1', x).attr('x2', x);
      // Cập nhật vị trí đường kẻ ngang
      horizontalLine.attr('y1', y).attr('y2', y);
      const xx = bisect(this.data, this.x.invert(x - this.margin.left));

      const date = formatTime(this.data[xx].date);
      this.pointer = {
        x: date,
        y: this.y.invert(y).toFixed(2),
      };
    });
  }

  visibleChanges(x: boolean) {
    if (x) {
      this.visible[1] = !this.visible[1];
    } else {
      this.visible[0] = !this.visible[0];
    }
    if (!this.visible[0]) {
      this.svgLine.attr('display', 'none');
    } else {
      this.svgLine.attr('display', 'unset');
    }
    if (!this.visible[1]) {
      this.svgCandle.attr('display', 'none');
    } else {
      this.svgCandle.attr('display', 'unset');
    }
  }
}
