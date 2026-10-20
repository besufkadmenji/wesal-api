import { visibleContractClient } from './contract-client-visibility';
import { Contract } from './entities/contract.entity';

const client = {
  id: 'client-id',
  name: 'Local Customer',
  phone: '511110001',
  dialCode: '+966',
  email: 'customer@wesal.test',
};
const contract = (paidAt: Date | null) =>
  ({ client, paidAt }) as unknown as Contract;

describe('visibleContractClient', () => {
  it('hides the customer from the provider before payment', () => {
    expect(
      visibleContractClient(contract(null), { type: 'provider' }),
    ).toMatchObject({ id: 'client-id', name: null, phone: '', email: '' });
  });

  it('shows the customer to the provider once paid', () => {
    expect(
      visibleContractClient(contract(new Date()), { type: 'provider' }),
    ).toBe(client);
  });

  it('always shows the customer to the customer and to admins', () => {
    expect(visibleContractClient(contract(null), { type: 'user' })).toBe(
      client,
    );
    expect(visibleContractClient(contract(null), { type: 'admin' })).toBe(
      client,
    );
  });
});
