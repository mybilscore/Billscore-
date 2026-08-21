// app/api/auth/validate-password-change/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { hash } from "bcrypt";
import { z } from "zod";

const passwordChangeSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Confirm password is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// GET - Show the password change form
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing token" },
        { status: 400 }
      );
    }

    // Find user with this token
    const users = await prisma.user.findMany({
      where: {
        metadata: {
          path: "$.passwordChangeToken",
          equals: token,
        },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        username: true,
        metadata: true,
      },
    });

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 404 }
      );
    }

    const user = users[0];
    const expiry = user.metadata?.passwordChangeExpiry;
    
    if (expiry && new Date(expiry) < new Date()) {
      return NextResponse.json(
        { success: false, error: "This link has expired. Please request a new one." },
        { status: 410 }
      );
    }

    // Return a simple HTML form
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Change Password - Bilscore</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      padding: 40px;
      max-width: 420px;
      width: 100%;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1a1a2e;
      font-size: 24px;
      margin-bottom: 8px;
    }
    .header p {
      color: #666;
      font-size: 14px;
    }
    .user-info {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 25px;
      font-size: 14px;
      color: #333;
    }
    .user-info strong {
      display: block;
      margin-bottom: 4px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-group label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #333;
      margin-bottom: 5px;
    }
    .form-group input {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.3s;
    }
    .form-group input:focus {
      outline: none;
      border-color: #0066cc;
    }
    .form-group .hint {
      font-size: 12px;
      color: #888;
      margin-top: 4px;
    }
    .error {
      color: #dc3545;
      font-size: 14px;
      margin-top: 4px;
      display: none;
    }
    .success {
      color: #28a745;
      font-size: 14px;
      margin-top: 4px;
      display: none;
    }
    .btn {
      width: 100%;
      padding: 14px;
      background: #0066cc;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.3s;
    }
    .btn:hover {
      background: #0052a3;
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-success {
      background: #28a745;
    }
    .btn-success:hover {
      background: #1e7e34;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 12px;
      color: #888;
    }
    .loading {
      display: none;
      text-align: center;
      margin: 15px 0;
    }
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #0066cc;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Change Password</h1>
      <p>Set a new password for your Bilscore account</p>
    </div>

    <div class="user-info">
      <strong>${user.fullName}</strong>
      ${user.email ? `<span>${user.email}</span>` : ''}
      ${user.username ? `<br><span style="color:#888;">@${user.username}</span>` : ''}
    </div>

    <form id="passwordForm">
      <input type="hidden" name="token" value="${token}" />

      <div class="form-group">
        <label for="newPassword">New Password</label>
        <input type="password" id="newPassword" name="newPassword" placeholder="Enter new password" required minlength="8" />
        <div class="hint">Minimum 8 characters</div>
      </div>

      <div class="form-group">
        <label for="confirmPassword">Confirm Password</label>
        <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Confirm new password" required minlength="8" />
      </div>

      <div id="errorMessage" class="error"></div>
      <div id="successMessage" class="success"></div>

      <div class="loading" id="loading">
        <div class="spinner"></div>
        <p style="margin-top:10px;color:#666;">Processing...</p>
      </div>

      <button type="submit" class="btn" id="submitBtn">Change Password</button>
    </form>

    <div class="footer">
      This link is valid for 7 days. If you didn't request this, please ignore this email.
    </div>
  </div>

  <script>
    document.getElementById('passwordForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const form = this;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const token = document.querySelector('input[name="token"]').value;
      const errorEl = document.getElementById('errorMessage');
      const successEl = document.getElementById('successMessage');
      const loadingEl = document.getElementById('loading');
      const submitBtn = document.getElementById('submitBtn');

      // Reset messages
      errorEl.style.display = 'none';
      successEl.style.display = 'none';
      errorEl.textContent = '';
      successEl.textContent = '';

      // Validate
      if (newPassword.length < 8) {
        errorEl.textContent = 'Password must be at least 8 characters';
        errorEl.style.display = 'block';
        return;
      }

      if (newPassword !== confirmPassword) {
        errorEl.textContent = 'Passwords do not match';
        errorEl.style.display = 'block';
        return;
      }

      // Show loading
      loadingEl.style.display = 'block';
      submitBtn.disabled = true;

      try {
        const response = await fetch('/api/auth/validate-password-change', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            newPassword,
            confirmPassword
          }),
        });

        const data = await response.json();

        loadingEl.style.display = 'none';
        submitBtn.disabled = false;

        if (data.success) {
          successEl.textContent = data.message || 'Password changed successfully!';
          successEl.style.display = 'block';
          submitBtn.textContent = 'Password Changed';
          submitBtn.className = 'btn btn-success';
          submitBtn.disabled = true;
        } else {
          errorEl.textContent = data.error || 'Failed to change password';
          errorEl.style.display = 'block';
        }
      } catch (error) {
        loadingEl.style.display = 'none';
        submitBtn.disabled = false;
        errorEl.textContent = 'An error occurred. Please try again.';
        errorEl.style.display = 'block';
      }
    });
  </script>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("Password change page error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load password change page" },
      { status: 500 }
    );
  }
}

// POST - Process password change
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validated = passwordChangeSchema.parse(body);

    // Find user with this token
    const users = await prisma.user.findMany({
      where: {
        metadata: {
          path: "$.passwordChangeToken",
          equals: validated.token,
        },
      },
      select: {
        id: true,
        fullName: true,
        metadata: true,
        passwordHash: true,
      },
    });

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 404 }
      );
    }

    const user = users[0];
    const expiry = user.metadata?.passwordChangeExpiry;
    
    if (expiry && new Date(expiry) < new Date()) {
      return NextResponse.json(
        { success: false, error: "This link has expired. Please request a new one." },
        { status: 410 }
      );
    }

    // Check if password is different from old one
    const isSamePassword = await bcrypt.compare(validated.newPassword, user.passwordHash);
    if (isSamePassword) {
      return NextResponse.json(
        { success: false, error: "New password must be different from your current password" },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await hash(validated.newPassword, 10);

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        // Remove the token after use
        metadata: {
          ...(user.metadata as any || {}),
          passwordChangeToken: null,
          passwordChangeExpiry: null,
          passwordChangedAt: new Date().toISOString(),
        },
      },
    });

    // Log the change
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "PASSWORD_CHANGED",
        entityType: "User",
        entityId: user.id,
        metadata: {
          source: "whatsapp_password_change",
          timestamp: new Date().toISOString(),
        },
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully! You can now login with your new password.",
    });

  } catch (error: any) {
    console.error("Password change error:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: error.errors[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Failed to change password" },
      { status: 500 }
    );
  }
}