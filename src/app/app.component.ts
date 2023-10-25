import { Component } from '@angular/core';
import { ticker } from './extra/data';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'ChartProject';
  ticker = ticker;
}
