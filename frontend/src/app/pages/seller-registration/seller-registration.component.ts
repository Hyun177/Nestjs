import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SellerRequestService } from '../../core/services/seller-request.service';
import { Router } from '@angular/router';

import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-seller-registration',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
  ],
  template: `
    <div class="seller-registration-wrapper">
      <div class="registration-layout">
        <!-- Left Banner Side -->
        <div class="banner-side">
          <div class="banner-content">
            <div class="logo-circle">
              <span nz-icon nzType="shop" nzTheme="outline"></span>
            </div>
            <h1>Bắt đầu kinh doanh cùng <span class="brand-text">SOFTBEE</span></h1>
            <p>
              Tham gia cộng đồng người bán hàng lớn nhất Việt Nam. Mở rộng quy mô, tiếp cận hàng
              triệu khách hàng và tăng trưởng doanh thu vượt bậc.
            </p>

            <div class="pros-list">
              <div class="pro-item">
                <span class="icon-wrap"><span nz-icon nzType="rocket"></span></span>
                <div class="pro-text">
                  <span class="title">Tăng trưởng nhanh</span>
                  <span class="desc">Công cụ marketing mạnh mẽ giúp bùng nổ doanh số</span>
                </div>
              </div>
              <div class="pro-item">
                <span class="icon-wrap"><span nz-icon nzType="safety-certificate"></span></span>
                <div class="pro-text">
                  <span class="title">Hỗ trợ 24/7</span>
                  <span class="desc">Đội ngũ hỗ trợ chuyên nghiệp luôn bên bạn</span>
                </div>
              </div>
              <div class="pro-item">
                <span class="icon-wrap"><span nz-icon nzType="dashboard"></span></span>
                <div class="pro-text">
                  <span class="title">Báo cáo chi tiết</span>
                  <span class="desc">Theo dõi hiệu quả kinh doanh qua bảng điều khiển</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Form Side -->
        <div class="form-side">
          <div class="registration-form-card">
            <div class="form-header">
              <h2>Đăng ký Người bán</h2>
              <p>Vui lòng điền đầy đủ thông tin để bắt đầu hành trình của bạn.</p>
            </div>

            <form nz-form [formGroup]="sellerForm" (ngSubmit)="onSubmit()" nzLayout="vertical">
              <nz-form-item>
                <nz-form-label [nzRequired]="true">Tên shop</nz-form-label>
                <nz-form-control nzErrorTip="Vui lòng nhập tên shop của bạn!">
                  <nz-input-group [nzPrefix]="shopPrefix">
                    <input
                      nz-input
                      formControlName="shopName"
                      placeholder="Ví dụ: SoftBee Official Store"
                    />
                  </nz-input-group>
                  <ng-template #shopPrefix><span nz-icon nzType="shop"></span></ng-template>
                </nz-form-control>
              </nz-form-item>

              <nz-form-item>
                <nz-form-label>Mô tả chi tiết</nz-form-label>
                <nz-form-control>
                  <textarea
                    nz-input
                    [nzAutosize]="{ minRows: 3, maxRows: 5 }"
                    formControlName="description"
                    placeholder="Giới thiệu ngắn gọn về shop của bạn..."
                  ></textarea>
                </nz-form-control>
              </nz-form-item>

              <div class="form-row">
                <nz-form-item class="flex-1">
                  <nz-form-label [nzRequired]="true">Số điện thoại</nz-form-label>
                  <nz-form-control nzErrorTip="Số điện thoại là bắt buộc!">
                    <nz-input-group [nzPrefix]="phonePrefix">
                      <input nz-input formControlName="phone" placeholder="09xx xxx xxx" />
                    </nz-input-group>
                    <ng-template #phonePrefix><span nz-icon nzType="phone"></span></ng-template>
                  </nz-form-control>
                </nz-form-item>
              </div>

              <nz-form-item>
                <nz-form-label [nzRequired]="true">Địa chỉ kinh doanh</nz-form-label>
                <nz-form-control nzErrorTip="Vui lòng cung cấp địa chỉ!">
                  <nz-input-group [nzPrefix]="addrPrefix">
                    <input
                      nz-input
                      formControlName="address"
                      placeholder="Số nhà, tên đường, quận/huyện..."
                    />
                  </nz-input-group>
                  <ng-template #addrPrefix><span nz-icon nzType="environment"></span></ng-template>
                </nz-form-control>
              </nz-form-item>

              <div class="terms-agree">
                Bằng việc nhấn đăng ký, bạn đã đồng ý với
                <a href="javascript:void(0)">Điều khoản dịch vụ</a> &
                <a href="javascript:void(0)">Chính sách bảo mật</a> của chúng tôi.
              </div>

              <button
                nz-button
                class="submit-btn"
                [nzType]="'primary'"
                [nzLoading]="loading"
                [disabled]="!sellerForm.valid"
              >
                Hoàn tất đăng ký
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');

      .seller-registration-wrapper {
        min-height: calc(100vh - 80px);
        display: flex;
        background: #fafafa;
        font-family: 'Inter', sans-serif;
        padding: 40px 20px;
      }

      .registration-layout {
        display: flex;
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        background: #fff;
        border-radius: 40px;
        overflow: hidden;
        box-shadow: 0 40px 100px -30px rgba(0, 0, 0, 0.12);
      }

      /* Banner Side */
      .banner-side {
        flex: 1.2;
        background:
          linear-gradient(145deg, #1e1b4b 0%, #312e81 100%),
          url('https://images.unsplash.com/photo-1556740734-733d16857997?auto=format&fit=crop&w=1200&q=80');
        background-blend-mode: overlay;
        background-size: cover;
        background-position: center;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 80px 60px;
        position: relative;
        color: #fff;

        &::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(30, 27, 75, 0.9), transparent);
          pointer-events: none;
        }
      }

      .banner-content {
        position: relative;
        z-index: 20;
        max-width: 440px;

        .logo-circle {
          width: 72px;
          height: 72px;
          background: #6366f1;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 32px;
          font-size: 36px;
          box-shadow: 0 15px 35px rgba(99, 102, 241, 0.4);
        }

        h1 {
          color: #fff;
          font-size: 3.5rem;
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 24px;
          letter-spacing: -2px;

          .brand-text {
            color: #818cf8;
            text-decoration: underline;
            text-decoration-thickness: 6px;
            text-underline-offset: 4px;
          }
        }

        p {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.6;
          margin-bottom: 60px;
        }
        .pros-list {
          display: flex;
          flex-direction: column;
          gap: 32px;

          .pro-item {
            display: flex;
            gap: 20px;
            align-items: flex-start;

            .icon-wrap {
              width: 52px;
              height: 52px;
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(8px);
              border-radius: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 22px;
              color: #a5b4fc;
              border: 1px solid rgba(255, 255, 255, 0.2);
              flex-shrink: 0;
            }

            .pro-text {
              .title {
                display: block;
                font-size: 1.2rem;
                font-weight: 800;
                margin-bottom: 4px;
                color: #fff;
              }
              .desc {
                font-size: 0.95rem;
                color: rgba(255, 255, 255, 0.6);
                line-height: 1.4;
              }
            }
          }
        }
      }

      /* Form Side */
      .form-side {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 80px 60px;
        background: #ffffff;
      }

      .registration-form-card {
        width: 100%;
        max-width: 440px;

        .form-header {
          margin-bottom: 48px;

          h2 {
            font-size: 2.2rem;
            font-weight: 900;
            color: #0f172a;
            margin-bottom: 12px;
            letter-spacing: -1.5px;
          }

          p {
            color: #64748b;
            font-size: 1.1rem;
            font-weight: 500;
            line-height: 1.4;
          }
        }
      }

      :host ::ng-deep {
        .ant-form-item {
          margin-bottom: 28px;
        }

        .ant-form-item-label > label {
          font-weight: 700;
          color: #1e293b;
          font-size: 14px;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .ant-input {
          border-radius: 14px;
          padding: 14px 18px;
          border: 2px solid #f1f5f9;
          font-weight: 600;
          font-size: 15px;
          transition: all 0.3s;
          background: #f8fafc;

          &:focus {
            background: #fff;
            border-color: #4f46e5;
            box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
          }
        }

        .ant-input-affix-wrapper {
          border-radius: 14px;
          border: 2px solid #f1f5f9;
          padding: 0 18px;
          background: #f8fafc;
          transition: all 0.3s;

          &:hover,
          .ant-input-affix-wrapper-focused {
            border-color: #4f46e5;
            box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
            background: #fff;
          }

          .ant-input {
            border: none !important;
            background: transparent !important;
            padding: 14px 10px;

            &:focus {
              box-shadow: none !important;
            }
          }

          .anticon {
            color: #64748b;
            font-size: 18px;
          }
        }
      }

      .terms-agree {
        font-size: 13px;
        color: #64748b;
        line-height: 1.6;
        margin-bottom: 36px;
        font-weight: 500;

        a {
          color: #4f46e5;
          font-weight: 800;
          text-decoration: none;
          &:hover {
            text-decoration: underline;
          }
        }
      }

      .submit-btn {
        width: 100%;
        height: 64px;
        border-radius: 18px;
        font-size: 1.1rem;
        font-weight: 900;
        background: linear-gradient(to right, #4f46e5, #6366f1);
        border: none;
        color: #fff;
        box-shadow: 0 14px 28px rgba(79, 70, 229, 0.25);
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        text-transform: uppercase;
        letter-spacing: 1px;

        &:hover:not(:disabled) {
          background: linear-gradient(to right, #4338ca, #4f46e5);
          transform: translateY(-3px);
          box-shadow: 0 18px 40px rgba(79, 70, 229, 0.35);
        }

        &:disabled {
          background: #f1f5f9;
          color: #94a3b8;
          box-shadow: none;
        }
      }

      @media (max-width: 1100px) {
        .banner-side {
          display: none;
        }
        .registration-layout {
          max-width: 550px;
          border-radius: 30px;
        }
        .form-side {
          padding: 40px;
        }
        .registration-form-card {
          padding: 0;
        }
      }
    `,
  ],
})
export class SellerRegistrationComponent implements OnInit {
  private fb = inject(FormBuilder);
  private sellerRequestService = inject(SellerRequestService);
  private message = inject(NzMessageService);
  private router = inject(Router);

  sellerForm: FormGroup;
  loading = false;

  constructor() {
    this.sellerForm = this.fb.group({
      shopName: ['', [Validators.required]],
      description: [''],
      phone: ['', [Validators.required]],
      address: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {}

  onSubmit() {
    if (this.sellerForm.valid) {
      this.loading = true;
      this.sellerRequestService.submitRequest(this.sellerForm.value).subscribe({
        next: () => {
          this.message.success(
            'Registration submitted successfully! Please wait for admin approval.',
          );
          this.router.navigate(['/profile']);
          this.loading = false;
        },
        error: (err) => {
          this.message.error('Submission failed. You might already have a pending request.');
          this.loading = false;
          console.error(err);
        },
      });
    }
  }
}
