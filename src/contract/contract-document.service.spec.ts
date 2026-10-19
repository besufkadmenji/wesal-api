import { Repository } from 'typeorm';
import { FileUploadService } from '../../lib/file-upload';
import { ContractDocumentService } from './contract-document.service';
import { ContractDocument } from './entities/contract-document.entity';
import { Contract } from './entities/contract.entity';
import { ContractSignatureType } from './enums/contract-signature-type.enum';
import { ContractStatus } from './enums/contract-status.enum';

// 1x1 transparent PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const contract = (overrides: Partial<Contract> = {}) =>
  ({
    id: 'contract-id',
    publicId: 1184,
    status: ContractStatus.COMPLETED,
    version: 2,
    clientId: 'client-id',
    providerId: 'provider-id',
    agreedPrice: 300,
    depositPercent: 20,
    downPayment: 60,
    commissionPercent: 10,
    commissionAmount: 30,
    vatRate: 15,
    vatAmount: 45,
    totalPayable: 345,
    createdAt: new Date('2026-10-10T08:00:00Z'),
    acceptedAt: new Date('2026-10-11T08:00:00Z'),
    paidAt: new Date('2026-10-12T08:00:00Z'),
    completedAt: new Date('2026-10-15T08:00:00Z'),
    customerAddress: 'الرياض، حي النخيل',
    providerAddress: 'Riyadh',
    deliveryCompanyNameAr: 'سمسا',
    contractDocumentText: 'يلتزم مقدم الخدمة بتنفيذ العمل '.repeat(20),
    client: { name: 'Local Customer', phone: '511110001', dialCode: '+966' },
    provider: { commercialName: 'Local Plumbing Co', phone: '511110002' },
    conversation: { listing: { name: 'Emergency plumbing repair' } },
    signatures: [
      {
        signatureType: ContractSignatureType.CUSTOMER_ACCEPTANCE,
        signatureData: 'customer-signature.png',
        signedAt: new Date('2026-10-11T08:00:00Z'),
      },
      {
        signatureType: ContractSignatureType.PROVIDER_COMPLETION,
        signatureData: 'missing.png',
        signedAt: new Date('2026-10-15T08:00:00Z'),
      },
    ],
    document: null,
    ...overrides,
  }) as unknown as Contract;

const setup = (value: Contract) => {
  const files = {
    getFile: jest.fn((key: string) =>
      key === 'customer-signature.png'
        ? Promise.resolve(PNG)
        : Promise.reject(new Error('not found')),
    ),
    saveFile: jest.fn(() => Promise.resolve({ path: 'contracts/doc.pdf' })),
  };
  const documents = {
    findOne: jest.fn(() => Promise.resolve(null)),
    upsert: jest.fn(() => Promise.resolve()),
  };
  const service = new ContractDocumentService(
    {
      findOne: jest.fn(() => Promise.resolve(value)),
    } as unknown as Repository<Contract>,
    documents as unknown as Repository<ContractDocument>,
    files as unknown as FileUploadService,
  );
  return { service, files, documents };
};

describe('ContractDocumentService', () => {
  it('renders a completed contract with file signatures and caches it', async () => {
    const { service, files, documents } = setup(contract());
    const pdf = await service.forAdmin('contract-id');
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(files.getFile).toHaveBeenCalledWith('customer-signature.png');
    expect(files.getFile).toHaveBeenCalledWith('missing.png');
    expect(documents.upsert).toHaveBeenCalledTimes(1);
  });

  it('renders an unfinished contract fresh without caching it', async () => {
    const { service, files, documents } = setup(
      contract({ status: ContractStatus.IN_PROGRESS, completedAt: null }),
    );
    const pdf = await service.forAdmin('contract-id');
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(documents.findOne).not.toHaveBeenCalled();
    expect(files.saveFile).not.toHaveBeenCalled();
    expect(documents.upsert).not.toHaveBeenCalled();
  });

  it('reuses the cached PDF of a completed contract', async () => {
    const { service, files } = setup(
      contract({
        document: { version: 2, path: 'contracts/doc.pdf' },
      } as Partial<Contract>),
    );
    files.getFile.mockResolvedValueOnce(Buffer.from('%PDF-cached'));
    const pdf = await service.forAdmin('contract-id');
    expect(pdf.toString()).toBe('%PDF-cached');
    expect(files.saveFile).not.toHaveBeenCalled();
  });

  it('keeps data URI signatures working', async () => {
    const { service, files } = setup(
      contract({
        status: ContractStatus.IN_PROGRESS,
        signatures: [
          {
            signatureType: ContractSignatureType.CUSTOMER_ACCEPTANCE,
            signatureData: `data:image/png;base64,${PNG.toString('base64')}`,
            signedAt: new Date(),
          },
        ],
      } as Partial<Contract>),
    );
    await service.forAdmin('contract-id');
    expect(files.getFile).not.toHaveBeenCalled();
  });
});
