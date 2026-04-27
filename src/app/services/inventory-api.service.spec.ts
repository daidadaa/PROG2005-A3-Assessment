// API service unit tests
// Author: WU Shaowei — mocked HTTP tests for GET/PUT/DELETE, error handling

import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { InventoryApiService } from './inventory-api.service';
import { NetworkStatusService } from './network-status.service';

const API_URL = 'https://prog2005.it.scu.edu.au/ArtGalley';

const mockItems = [
  {
    item_id: 100,
    item_name: 'Wireless Mouse',
    category: 'Electronics',
    quantity: 50,
    price: 29,
    supplier_name: 'Peripherals Ltd',
    stock_status: 'In stock',
    featured_item: 0
  },
  {
    item_id: 101,
    item_name: 'Ergonomic Chair',
    category: 'Furniture',
    quantity: 8,
    price: 450,
    supplier_name: 'Comfort Co',
    stock_status: 'Low stock',
    featured_item: 1
  }
];

describe('InventoryApiService', () => {
  let svc: InventoryApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    const netSpy = jasmine.createSpyObj('NetworkStatus', ['cacheItems', 'getCachedItems'], { isOnline: true });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        InventoryApiService,
        { provide: NetworkStatusService, useValue: netSpy }
      ]
    });

    svc = TestBed.inject(InventoryApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should create service', () => {
    expect(svc).toBeTruthy();
  });

  it('GET items and map to camelCase', (done) => {
    svc.getAllItems().subscribe(items => {
      expect(items.length).toBe(2);
      expect(items[0].itemId).toBe(100);
      expect(items[0].itemName).toBe('Wireless Mouse');
      expect(items[0].category).toBe('Electronics');
      expect(items[0].stockStatus).toBe('In Stock'); // normalized
      done();
    });
    const req = httpMock.expectOne(API_URL);
    req.flush(mockItems);
  });

  it('POST new item with snake_case body', (done) => {
    const newItem = {
      itemName: 'Keyboard',
      category: 'Electronics' as any,
      quantity: 20,
      price: 79,
      supplierName: 'TechCo',
      stockStatus: 'In Stock' as any,
      featuredItem: 0,
      specialNote: ''
    };

    svc.createItem(newItem).subscribe(res => {
      expect(res).toBeTruthy();
      done();
    });

    const req = httpMock.expectOne(API_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.item_name).toBe('Keyboard');
    expect(req.request.body.quantity).toBe(20);
    req.flush({ success: true });
  });

  it('PUT update by name', (done) => {
    svc.updateItemByName('Chair', { price: 999 }).subscribe(res => {
      expect(res.success).toBe(true);
      done();
    });

    const req = httpMock.expectOne(`${API_URL}/Chair`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.price).toBe(999);
    req.flush({ success: true });
  });

  it('DELETE by name', (done) => {
    svc.deleteItemByName('Mouse').subscribe(res => {
      expect(res.success).toBe(true);
      done();
    });

    const req = httpMock.expectOne(`${API_URL}/Mouse`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true });
  });
});
