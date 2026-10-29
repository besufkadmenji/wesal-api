import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { errorMessageRegistry } from '../../../lib/errors/error-message.registry';
import { FAQ_ERROR_CODES } from '../errors/faq.error-codes';
import { CreateFaqInput } from './create-faq.input';
import { UpdateFaqInput } from './update-faq.input';

const codes = async (type: typeof CreateFaqInput, input: object) =>
  (await validate(plainToInstance(type, input))).flatMap((error) =>
    Object.values(error.constraints ?? {}),
  );

const valid = {
  questionEn: 'How do I pay?',
  questionAr: 'كيف أدفع؟',
  answerEn: 'Pay from the contract page.',
  answerAr: 'ادفع من صفحة التعاقد مباشرة.',
};

/** ClickUp 869fmp1t4: one-character FAQs were accepted. */
describe('FAQ input lengths', () => {
  it('rejects one-character questions and answers with translatable codes', async () => {
    expect(
      new Set(
        await codes(CreateFaqInput, {
          questionEn: 'a',
          questionAr: 'ب',
          answerEn: 'c',
          answerAr: 'د',
        }),
      ),
    ).toEqual(new Set(Object.values(FAQ_ERROR_CODES)));
    expect(errorMessageRegistry.get(FAQ_ERROR_CODES.ANSWER_AR_LENGTH)?.ar).toBe(
      'الإجابة بالعربية يجب أن تكون من 10 إلى 500 حرف',
    );
  });

  it('accepts valid lengths', async () => {
    expect(await codes(CreateFaqInput, valid)).toEqual([]);
  });

  it('still allows a partial update', async () => {
    expect(
      await codes(UpdateFaqInput, {
        id: '6f1c1f3e-8a63-4e0e-9a43-1f7f2f0c9b11',
        isActive: false,
      }),
    ).toEqual([]);
    expect(
      await codes(UpdateFaqInput, {
        id: '6f1c1f3e-8a63-4e0e-9a43-1f7f2f0c9b11',
        questionEn: 'a',
      }),
    ).toEqual([FAQ_ERROR_CODES.QUESTION_EN_LENGTH]);
  });
});
