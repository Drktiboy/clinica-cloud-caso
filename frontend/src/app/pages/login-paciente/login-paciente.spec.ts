import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginPaciente } from './login-paciente';

describe('LoginPaciente', () => {
  let component: LoginPaciente;
  let fixture: ComponentFixture<LoginPaciente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPaciente],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPaciente);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
