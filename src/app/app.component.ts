import { Component, OnInit } from '@angular/core';
import { ticker } from './extra/data';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  dataText: string[] = [];
  data: any[] = [];
  field: string[] = [];
  title = 'ChartProject';
  ticker = ticker;
  loading: boolean = true;
  constructor(private httpClient: HttpClient) {}
  ngOnInit() {
    let match;
    const regex = /<([^>]+)>/g;
    this.loading = true;
    this.httpClient
      .get('../assets/FPTD.txt', { responseType: 'text' })
      .subscribe((data) => {
        this.dataText = data.split('\n');
        while ((match = regex.exec(this.dataText[0])) !== null) {
          this.field.push(match[1]);
        }
        this.dataText.splice(0, 1);

        this.dataText.forEach((data) => {
          let ndata: any[] = data.split(',');

          let dataobj = {};

          this.field.forEach((field, index) => {
            if (field == 'DTYYYYMMDD' && !!ndata[index]) {
              const dateString = ndata[index];
              const year = Number(dateString.substr(0, 4));
              const month = Number(dateString.substr(4, 2)) - 1;
              const day = Number(dateString.substr(6, 2));
              const dateObject = new Date(year, month, day);
              dataobj = { ...dataobj, date: dateObject };
            } else dataobj = { ...dataobj, [field]: ndata[index] };
          });

          this.data.push(dataobj);
        });
        this.loading = false;
        console.log('false');
      });
  }
  button() {
    this.loading = !this.loading;
    console.log(this.data);
  }
}
