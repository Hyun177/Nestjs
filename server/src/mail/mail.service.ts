import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

type MailConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure?: boolean;
  requireTLS?: boolean;
  tlsRejectUnauthorized?: boolean;
};

type OrderEmailItem = {
  name: string;
  quantity: number;
  price: number;
  color?: string | null;
  size?: string | null;
};

type OrderEmailSummary = {
  id: number;
  status?: string;
  paymentMethod?: string;
  shippingAddress?: string | null;
  shippingPhone?: string | null;
  items?: OrderEmailItem[];
  shippingFee?: number;
  discountAmount?: number;
  totalAmount?: number;
  voucherCode?: string | null;
  createdAt?: Date;
  completedAt?: Date;
};

@Injectable()
export class MailService {
  private getConfig(): MailConfig | null {
    const host = process.env.MAIL_HOST?.trim();
    const port = Number(process.env.MAIL_PORT || 0);
    const user = process.env.MAIL_USER?.trim();
    const pass = process.env.MAIL_PASS?.trim();
    const from = process.env.MAIL_FROM || '"SOFTBEE" <no-reply@softbee.local>';

    const secureEnv = process.env.MAIL_SECURE;
    const requireTLSEnv = process.env.MAIL_REQUIRE_TLS;
    const tlsRejectEnv = process.env.MAIL_TLS_REJECT_UNAUTHORIZED;

    const secure =
      secureEnv !== undefined
        ? secureEnv === 'true' || secureEnv === '1'
        : port === 465;
    const requireTLS =
      requireTLSEnv !== undefined
        ? requireTLSEnv === 'true' || requireTLSEnv === '1'
        : port === 587; // STARTTLS
    const tlsRejectUnauthorized =
      tlsRejectEnv !== undefined
        ? tlsRejectEnv === 'true' || tlsRejectEnv === '1'
        : true;

    if (!host || !port || !user || !pass) {
      console.log('Email skipped: missing MAIL_* env config', {
        hasHost: !!host,
        hasPort: !!port,
        hasUser: !!user,
        hasPass: !!pass,
      });
      return null;
    }
    return {
      host,
      port,
      user,
      pass,
      from,
      secure,
      requireTLS,
      tlsRejectUnauthorized,
    };
  }

  private createTransporter(cfg: MailConfig) {
    const debug =
      process.env.MAIL_DEBUG === 'true' || process.env.MAIL_DEBUG === '1';
    return nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure ?? cfg.port === 465,
      pool: true, // Maintain persistent connection for bulk emails
      auth: { user: cfg.user, pass: cfg.pass },
      tls: {
        // Render/Gmail STARTTLS stability
        servername: cfg.host,
        // Default to false for better compatibility on cloud providers unless specifically overridden
        rejectUnauthorized: cfg.tlsRejectUnauthorized ?? false,
      },
      connectionTimeout: 20_000,
      greetingTimeout: 20_000,
      socketTimeout: 30_000,
      logger: debug,
      debug,
    });
  }

  private async sendMailSafely(
    transporter: nodemailer.Transporter,
    payload: nodemailer.SendMailOptions,
  ): Promise<nodemailer.SentMessageInfo> {
    const debug =
      process.env.MAIL_DEBUG === 'true' || process.env.MAIL_DEBUG === '1';
    try {
      if (debug) {
        await transporter.verify();
      }
      const info: nodemailer.SentMessageInfo =
        await transporter.sendMail(payload);
      if (debug) {
        console.log('Email sent:', {
          messageId: info.messageId,
          accepted: info.accepted,
          rejected: info.rejected,
          response: info.response,
        });
      }
      return info as unknown as nodemailer.SentMessageInfo;
    } catch (err: any) {
      console.log('Email send failed:', {
        name: err?.name,
        code: err?.code,
        command: err?.command,
        responseCode: err?.responseCode,
        response: err?.response,
        message: err?.message,
      });
      throw err;
    }
  }

  private getFrontendUrl() {
    return process.env.FRONTEND_URL || 'https://finalsoa115.site';
  }

  private formatMoney(value?: number) {
    if (value === undefined || value === null || Number.isNaN(Number(value)))
      return '';
    return Number(value).toLocaleString('vi-VN') + ' VNĐ';
  }

  private escapeHtml(input: string) {
    return String(input)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private buildTemplate(title: string, contentHtml: string) {
    const year = new Date().getFullYear();
    return `
    <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:20px">
      <div style="max-width:600px; margin:auto; background:white; border-radius:10px; overflow:hidden; box-shadow:0 4px 10px rgba(0,0,0,0.05)">
        <div style="background:#4CAF50; color:white; padding:16px; text-align:center; font-size:20px; font-weight:bold">
          SOFTBEE
        </div>
        <div style="padding:24px; color:#333">
          <h2 style="margin-top:0">${this.escapeHtml(title)}</h2>
          <div style="font-size:14px; line-height:1.6">
            ${contentHtml}
          </div>
        </div>
        <div style="background:#f1f1f1; padding:12px; text-align:center; font-size:12px; color:#888">
          © ${year} SOFTBEE. All rights reserved.
        </div>
      </div>
    </div>
    `;
  }

  private buildOrderDetailsBlock(summary: OrderEmailSummary) {
    const rows: string[] = [];
    const createdAt = summary.createdAt
      ? new Date(summary.createdAt).toLocaleString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
        })
      : '';
    if (createdAt) {
      rows.push(
        `<div>🕒 Thời gian đặt: <b>${this.escapeHtml(createdAt)}</b></div>`,
      );
    }
    const completedAt = summary.completedAt
      ? new Date(summary.completedAt).toLocaleString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
        })
      : '';
    if (completedAt) {
      rows.push(
        `<div>✅ Hoàn thành lúc: <b>${this.escapeHtml(completedAt)}</b></div>`,
      );
    }
    if (summary.paymentMethod) {
      rows.push(
        `<div>💳 Thanh toán: <b>${this.escapeHtml(summary.paymentMethod)}</b></div>`,
      );
    }
    if (summary.shippingPhone) {
      rows.push(
        `<div>📞 SĐT: <b>${this.escapeHtml(summary.shippingPhone)}</b></div>`,
      );
    }
    if (summary.shippingAddress) {
      rows.push(
        `<div>📍 Địa chỉ: <b>${this.escapeHtml(summary.shippingAddress)}</b></div>`,
      );
    }

    const moneyRows: string[] = [];
    if (summary.shippingFee !== undefined) {
      moneyRows.push(
        `<div>🚚 Phí ship: <b>${this.escapeHtml(this.formatMoney(summary.shippingFee))}</b></div>`,
      );
    }
    if (
      summary.discountAmount !== undefined &&
      Number(summary.discountAmount) > 0
    ) {
      moneyRows.push(
        `<div>🏷️ Giảm giá: <b>- ${this.escapeHtml(this.formatMoney(summary.discountAmount))}</b></div>`,
      );
    }
    if (summary.totalAmount !== undefined) {
      moneyRows.push(
        `<div>💰 Tổng thanh toán: <b>${this.escapeHtml(this.formatMoney(summary.totalAmount))}</b></div>`,
      );
    }

    const items = summary.items || [];
    const itemsHtml =
      items.length > 0
        ? `
        <div style="margin:16px 0 6px; font-weight:bold">📦 Sản phẩm</div>
        <table style="width:100%; border-collapse:collapse; font-size:13px">
          <thead>
            <tr>
              <th style="text-align:left; padding:8px; border-bottom:1px solid #eee">Tên</th>
              <th style="text-align:center; padding:8px; border-bottom:1px solid #eee">SL</th>
              <th style="text-align:right; padding:8px; border-bottom:1px solid #eee">Giá</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map((it) => {
                const variantParts = [it.color, it.size]
                  .filter(Boolean)
                  .join(' / ');
                const name = variantParts
                  ? `${it.name} <span style="color:#777">(${this.escapeHtml(variantParts)})</span>`
                  : this.escapeHtml(it.name);
                return `
                  <tr>
                    <td style="padding:8px; border-bottom:1px solid #f2f2f2">${name}</td>
                    <td style="padding:8px; text-align:center; border-bottom:1px solid #f2f2f2">${it.quantity}</td>
                    <td style="padding:8px; text-align:right; border-bottom:1px solid #f2f2f2">${this.escapeHtml(this.formatMoney(it.price))}</td>
                  </tr>`;
              })
              .join('')}
          </tbody>
        </table>
        `
        : '';

    const totalsHtml =
      moneyRows.length > 0
        ? `<div style="background:#f7faf7; padding:12px; border-radius:8px; margin-top:14px">${moneyRows.join('')}</div>`
        : '';

    return `
      ${rows.join('')}
      ${itemsHtml}
      ${totalsHtml}
    `;
  }

  async sendOrderReceived(email: string, summary: OrderEmailSummary) {
    const cfg = this.getConfig();
    if (!cfg) {
      console.log('Email skipped: missing MAIL_* env config');
      return;
    }
    const transporter = this.createTransporter(cfg);
    const url = `${this.getFrontendUrl()}/order-success`;
    const html = this.buildTemplate(
      `Xác nhận đơn hàng #${summary.id}`,
      `
        <p>Chào bạn 👋,</p>
        <p>Đơn hàng <b>#${summary.id}</b> của bạn đã được tiếp nhận.</p>
        <p>Chúng tôi sẽ xử lý đơn hàng trong thời gian sớm nhất.</p>

        ${this.buildOrderDetailsBlock(summary)}

        <div style="text-align:center; margin:20px 0">
          <a href="${this.escapeHtml(url)}" style="background:#4CAF50; color:white; padding:12px 20px; text-decoration:none; border-radius:6px; font-weight:bold">
            Xem đơn hàng
          </a>
        </div>

        <p>Cảm ơn bạn đã mua sắm tại <b>SOFTBEE</b> 💚</p>
      `,
    );
    await this.sendMailSafely(transporter, {
      from: cfg.from,
      to: email,
      subject: `Xác nhận đơn hàng #${summary.id}`,
      html,
    });
  }

  async sendOrderDelivered(email: string, summary: OrderEmailSummary) {
    const cfg = this.getConfig();
    if (!cfg) {
      console.log('Email skipped: missing MAIL_* env config');
      return;
    }
    const transporter = this.createTransporter(cfg);
    const url = `${this.getFrontendUrl()}/order-success`;
    const html = this.buildTemplate(
      `Đơn hàng #${summary.id} đã giao thành công 🎉`,
      `
        <p>Chào bạn 👋,</p>
        <p>Đơn hàng <b>#${summary.id}</b> của bạn đã được giao thành công.</p>

        <div style="background:#e8f5e9; padding:12px; border-radius:6px; margin:15px 0">
          ✔ Trạng thái: <b>Hoàn tất</b>
        </div>

        ${this.buildOrderDetailsBlock(summary)}

        <div style="text-align:center; margin:20px 0">
          <a href="${this.escapeHtml(url)}" style="background:#4CAF50; color:white; padding:12px 20px; text-decoration:none; border-radius:6px; font-weight:bold">
            Xem đơn hàng
          </a>
        </div>
      `,
    );
    await this.sendMailSafely(transporter, {
      from: cfg.from,
      to: email,
      subject: `Đơn hàng #${summary.id} đã giao thành công`,
      html,
    });
  }

  async sendNewVoucher(
    email: string,
    code: string,
    valueText: string,
    endDate?: Date,
    meta?: {
      minOrderAmount?: number;
      maxDiscountAmount?: number | null;
      usageLimit?: number;
      userUsageLimit?: number;
      startDate?: Date;
      isActive?: boolean;
    },
  ) {
    const cfg = this.getConfig();
    if (!cfg) {
      console.log('Email skipped: missing MAIL_* env config');
      return;
    }
    const transporter = this.createTransporter(cfg);
    const end = endDate
      ? new Date(endDate).toLocaleDateString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
        })
      : '';
    const start = meta?.startDate
      ? new Date(meta.startDate).toLocaleDateString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
        })
      : '';
    const url = `${this.getFrontendUrl()}/products`;
    const html = this.buildTemplate(
      `🎁 Bạn nhận được voucher mới!`,
      `
        <p>Chào bạn 👋,</p>
        <p>Bạn vừa nhận được voucher mới từ <b>SOFTBEE</b>:</p>

        <div style="text-align:center; margin:20px 0">
          <div style="display:inline-block; border:2px dashed #4CAF50; padding:16px 24px; font-size:20px; font-weight:bold; color:#4CAF50; border-radius:8px">
            ${this.escapeHtml(code)}
          </div>
        </div>

        <p>Giá trị: <b>${this.escapeHtml(valueText)}</b></p>
        ${
          meta?.minOrderAmount !== undefined && meta.minOrderAmount > 0
            ? `<p>Đơn tối thiểu: <b>${this.escapeHtml(this.formatMoney(meta.minOrderAmount))}</b></p>`
            : ''
        }
        ${
          meta?.maxDiscountAmount
            ? `<p>Giảm tối đa: <b>${this.escapeHtml(this.formatMoney(meta.maxDiscountAmount))}</b></p>`
            : ''
        }
        ${
          meta?.usageLimit !== undefined && meta.usageLimit > 0
            ? `<p>Số lượt (toàn hệ thống): <b>${this.escapeHtml(String(meta.usageLimit))}</b></p>`
            : ''
        }
        ${
          meta?.userUsageLimit !== undefined && meta.userUsageLimit > 0
            ? `<p>Số lượt / tài khoản: <b>${this.escapeHtml(String(meta.userUsageLimit))}</b></p>`
            : ''
        }
        ${start ? `<p>Hiệu lực từ: <b>${this.escapeHtml(start)}</b></p>` : ''}
        ${end ? `<p>Hạn sử dụng: <b>${this.escapeHtml(end)}</b></p>` : ''}

        <div style="text-align:center; margin:20px 0">
          <a href="${this.escapeHtml(url)}" style="background:#4CAF50; color:white; padding:12px 20px; text-decoration:none; border-radius:6px; font-weight:bold">
            Dùng ngay
          </a>
        </div>
      `,
    );
    await this.sendMailSafely(transporter, {
      from: cfg.from,
      to: email,
      subject: `Voucher mới: ${code}`,
      html,
    });
  }
}
