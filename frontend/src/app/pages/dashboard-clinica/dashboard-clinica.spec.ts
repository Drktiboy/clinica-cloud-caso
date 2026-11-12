import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardClinica } from './dashboard-clinica';

describe('DashboardClinica', () => {
  let component: DashboardClinica;
  let fixture: ComponentFixture<DashboardClinica>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardClinica],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardClinica);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
