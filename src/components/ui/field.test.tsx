import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from './field';
import { Input } from './input';

describe('Field', () => {
  it('links the error to the input for screen readers', () => {
    render(
      <Field label="Email address" error="Enter your email address">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText('Email address');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter your email address');
  });

  it('shakes the control only while there is an error', () => {
    const { rerender } = render(
      <Field label="Email address">
        <Input />
      </Field>,
    );
    const wrapper = screen.getByLabelText('Email address').parentElement;
    expect(wrapper).not.toHaveClass('animate-shake');

    rerender(
      <Field label="Email address" error="Enter your email address">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText('Email address').parentElement).toHaveClass('animate-shake');
  });
});
