import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Course } from '@maris-nails/shared';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('courses')
  getCourses(): Course[] {
    return this.appService.getCourses();
  }
}