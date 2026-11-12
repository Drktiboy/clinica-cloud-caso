import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginPersonal } from './login-personal';

describe('LoginPersonal', () => {
  let component: LoginPersonal;
  let fixture: ComponentFixture<LoginPersonal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPersonal],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPersonal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
