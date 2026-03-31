import type { ContractService } from '../db/database';
import type { AppServiceType } from '../stores/settingsStore';

/**
 * Parse servicesJson from Contract → ContractService[]
 */
export function parseContractServices(servicesJson: string): ContractService[] {
  try {
    return JSON.parse(servicesJson || '[]');
  } catch {
    return [];
  }
}

/**
 * Default services (all disabled at default prices)
 */
export function getDefaultContractServices(serviceTypes: AppServiceType[]): ContractService[] {
  return serviceTypes.map((s) => ({
    serviceId: s.id,
    enabled: true,
    price: s.defaultPrice,
  }));
}

/**
 * Calculate total service fee for a contract month
 * @param services - selected services from contract
 * @param numberOfTenants - number of tenants (for per-person services)
 * @param serviceDefinitions - definitions from settings store
 * @returns breakdown of each service cost + total
 */
export function calculateServiceFees(
  services: ContractService[],
  numberOfTenants: number,
  serviceDefinitions: AppServiceType[]
): { items: { serviceId: string; label: string; quantity: number; unitPrice: number; amount: number }[]; total: number } {
  const items: { serviceId: string; label: string; quantity: number; unitPrice: number; amount: number }[] = [];
  let total = 0;

  for (const svc of services) {
    if (!svc.enabled) continue;

    const serviceType = serviceDefinitions.find((s) => s.id === svc.serviceId);
    if (!serviceType) continue;

    const quantity = serviceType.unit === 'person' ? numberOfTenants : 1;
    const amount = svc.price * quantity;

    items.push({
      serviceId: svc.serviceId,
      label: serviceType.label,
      quantity,
      unitPrice: svc.price,
      amount,
    });

    total += amount;
  }

  return { items, total };
}
