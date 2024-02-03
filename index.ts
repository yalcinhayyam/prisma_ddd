
// OrderRepository.ts
import { Product as PrismaProduct, PrismaClient } from '@prisma/client';
import { v4 } from 'uuid';

// Money.ts
class Money {
    constructor(public amount: number, public currency: string) { }
}

// Product.ts
class Product {
    constructor(public productId: string, public name: string, public price: Money) { }
}
class OrderItem {
    constructor(public id: string, public orderId: string, public product: Product) { }

}
interface IOrder {
    readonly orderId: string
    readonly totalAmount: Money
    readonly items: OrderItem[]
}

interface IOrderRoot extends IOrder {
    get getTotalAmount(): Money
    get getLineItems(): OrderItem[]
    addLineItem(product: Product): void
    removeLineItem(product: Product): void
}
// Order.ts
class Order implements IOrder {
    public items: OrderItem[] = [];
    public totalAmount: Money = new Money(0.0, "USD");

    private constructor(public orderId: string) { }
    static create(): IOrderRoot {
        return new Order(v4())
    }
    static from(order: IOrder): IOrderRoot {
        const newOrder = new Order(order.orderId)
        newOrder.items = order.items
        newOrder.totalAmount = order.totalAmount

        return newOrder

    }
    addLineItem(product: Product): void {
        this.items.push({ id: v4(), product, orderId: this.orderId });
        this.totalAmount.amount += product.price.amount;
        this.totalAmount.currency = product.price.currency;
    }

    removeLineItem(product: Product): void {
        // const index = this.items.indexOf(product);
        const index = this.items.findIndex(item => item.product.productId === product.productId);
        if (index !== -1) {
            this.items.splice(index, 1);
            this.totalAmount.amount -= product.price.amount;
        }
    }

    get getTotalAmount(): Money {
        return this.totalAmount;
    }

    get getLineItems(): OrderItem[] {
        return [...this.items];
    }
}



interface IOrderRepository {
    save(order: Order): Promise<Order>;
    update(order: Order): Promise<Order | null>;
    delete(orderId: string): Promise<boolean>;
    getById(orderId: string): Promise<Order | null>;
    getAll(): Promise<Order[]>
}

class InMemoryOrderRepository implements IOrderRepository {
    private orders: Record<string, Order> = {};

    getAll(): Promise<Order[]> {
        const orderArray: Order[] = Object.values(this.orders);
        return Promise.resolve(orderArray);
    }

    save(order: Order): Promise<Order> {
        return Promise.resolve((this.orders[order.orderId] = order));
    }

    update(order: Order): Promise<Order | null> {
        return Promise.resolve((this.orders[order.orderId] = order));
    }

    delete(orderId: string): Promise<boolean> {
        return Promise.resolve(delete this.orders[orderId]);
    }

    getById(orderId: string): Promise<Order | null> {
        return Promise.resolve(this.orders[orderId]);
    }
}


const order = Order.create()


function mapOrder(order: {
    items: ({
        product: {
            id: string;
            productId: string;
            name: string;
            priceAmount: number;
            priceCurrency: string;
        };
    } & {
        id: string;
        orderId: string;
        productId: string;
    })[];
} & {
    id: string;
    orderId: string;
    totalAmount: number;
    totalCurrency: string;
    userId: string | null;
}
) {
    return Order.from({
        items: order.items.map((item) => ({
            id: item.id,
            orderId: order.orderId,
            product: {
                ...item.product, price:
                    new Money(item.product.priceAmount, item.product.priceCurrency),
            } satisfies Product
        })) satisfies OrderItem[],
        orderId: order.orderId,
        totalAmount: new Money(order.totalAmount, order.totalCurrency)

    })
}

const prisma = new PrismaClient();

([
    {
        name: "Product 1",
        price: new Money(20.0, "USD"),
        productId: v4()
    },
    {
        name: "Product 2",
        price: new Money(30.0, "USD"),
        productId: v4()
    }
] satisfies Product[]).forEach(({ name, price: { amount, currency }, productId }) => {
    prisma.product.create({
        data: {
            name,
            priceAmount: amount,
            priceCurrency: currency,
            productId,
        }
    })

})

class PrismaOrderRepository implements IOrderRepository {

    async save(order: Order): Promise<Order> {
        const retrievedOrder = await prisma.order.create({
            data: {
                orderId: order.orderId,
                totalAmount: order.getTotalAmount.amount,
                totalCurrency: order.getTotalAmount.currency,
                items: {
                    create: order.getLineItems.map((lineItem) => ({
                        productId: lineItem.product.productId,
                        orderId: lineItem.orderId,
                    })),
                },
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                },
            },
        })
        type O = typeof retrievedOrder
        return mapOrder(retrievedOrder)
    }

    async getAll(): Promise<Order[]> {
        const orders = await prisma.order.findMany({
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            },
        });

        return orders.map((dbOrder) =>
            mapOrder(dbOrder)

        );
    }


    async update(order: Order): Promise<Order | null> {
        const updatedOrder = await prisma.order.update({
            where: {
                orderId: order.orderId,
            },
            data: {
                totalAmount: order.getTotalAmount.amount,
                totalCurrency: order.getTotalAmount.currency,
                items: {
                    deleteMany: {}, // If you want to delete existing products
                    create: order.getLineItems.map((lineItem) => ({
                        productId: lineItem.product.productId,
                        name: lineItem.product.name,
                        priceAmount: lineItem.product.price.amount,
                        priceCurrency: lineItem.product.price.currency,
                    })),
                },
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            },
        });

        if (!updatedOrder) {
            return null;
        }

        return mapOrder(updatedOrder)
    }


    async delete(orderId: string): Promise<boolean> {
        const order = await prisma.order.findUnique({
            where: {
                id: orderId,
            },
            include: {
                items: {
                    include: { product: true }
                },
            },
        });

        if (!order) {
            throw new Error(`Order with id ${orderId} not found`);
        }

        // Delete associated products
        const deleteProductPromises = order.items.map(item =>
            prisma.product.delete({
                where: {
                    id: item.id,
                },
            })
        );

        // Wait for all product deletions to complete
        await Promise.all(deleteProductPromises);

        // Delete the order itself
        await prisma.order.delete({
            where: {
                id: orderId,
            },
        });

        return true;

    }

    async getById(orderId: string): Promise<Order | null> {

        const order = await prisma.order.findUnique({
            where: {
                orderId: orderId,
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                },
            },
        });
        if (order) {

            return mapOrder(order)
        }
        return null

    }
}

const withPrisma = async () => {


    const orderRepository = new PrismaOrderRepository();

    await orderRepository.save(order);

    // // Retrieve order by ID
    const retrievedOrder = await orderRepository.getAll();
    console.log("Retrieved Order:", retrievedOrder);

    // Delete order by ID
    await orderRepository.delete("8a6d635f-7b49-4179-9930-ba4805492cad");
}

const withInMemory = () => {



    // Example usage
    const orderRepository = new InMemoryOrderRepository();

    orderRepository.save(order);

    // Retrieve order by ID
    const retrievedOrder = orderRepository.getById("O1");
    console.log("Retrieved Order:", retrievedOrder);

    orderRepository.delete("O1");
    console.log(orderRepository.getAll())
}


// withPrisma()

// prisma.order.findUnique({
//     where: {
//         orderId: 'ec3dad67-32e0-4376-af1e-edbdcbc1f699'
//     },
//     include: {
//         products: true
//     }
// }).then(res => prisma.product.deleteMany({
//     where: {
//         orderId: res?.orderId
//     }
// }).then(res => {
//     prisma.order.delete({
//         where: {
//             orderId: 'ec3dad67-32e0-4376-af1e-edbdcbc1f699'
//         }
//     }).then(console.log)
// }))

const products: PrismaProduct[] = []
const orderRepository = new InMemoryOrderRepository();
orderRepository.save(order).then(res => {
    console.log(res)
    prisma.order.update({
        where: {
            orderId: ''
        },
        data: {
            user: {
                // disconnect: {} as any,
                // connect: {} as any,
                // delete: {} as any,
                // update: {} as any,
                // create: {} as any,
                // upsert: {} as any,
                // connectOrCreate: {} as any,
            },
            items: {

                create: [],
                deleteMany: [],
                updateMany: [],
                set: [],
                connect: [],
                disconnect: []
            }
        },
        include: { items: true }
    }).then(res => {
        // res.
    })
})


