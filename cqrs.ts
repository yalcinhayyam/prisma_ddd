// Define a command
class CreateItemCommand {
    constructor(public itemName: string) {}
}

// Define a query
class GetItemsQuery {
    constructor(public query: string) {}
}

// Define command handler
class CreateItemCommandHandler {
    handle(command: CreateItemCommand): void {
        console.log(`Creating item: ${command.itemName}`);
        // Perform logic to create the item in the system
    }
}

// Define query handler
class GetItemsQueryHandler {
    handle(query: GetItemsQuery): string[] {
        console.log(`Querying items with keyword: ${query.query}`);
        // Perform logic to retrieve items based on the query
        return [`Item 1 - ${query.query}`, `Item 2 - ${query.query}`];
    }
}

// Update the Mediator class to handle both commands and queries
class Mediator {
    private behaviors: IPipelineBehavior<any, any>[] = [];

    addBehavior(behavior: IPipelineBehavior<any, any>) {
        this.behaviors.push(behavior);
    }

    async send(request: any): Promise<any> {
        const handler = this.getHandler(request);

        const pipeline = this.behaviors.reduceRight(
            (next, behavior) => async () => await behavior.handle(request, next),
            async () => await handler.handle(request)
        );

        return await pipeline();
    }

    private getHandler(request: any): any {
        if (request instanceof CreateItemCommand) {
            return new CreateItemCommandHandler();
        } else if (request instanceof GetItemsQuery) {
            return new GetItemsQueryHandler();
        }

        throw new Error(`Handler not found for request: ${request}`);
    }
}

// Usage
const mediator = new Mediator();
mediator.addBehavior(new LoggingBehavior());

// Send a command
const createItemCommand = new CreateItemCommand('New Item');
mediator.send(createItemCommand)
    .then(() => console.log('CreateItemCommand executed successfully'))
    .catch(error => console.error(`Error: ${error.message}`));

// Send a query
const getItemsQuery = new GetItemsQuery('Query Keyword');
mediator.send(getItemsQuery)
    .then(response => console.log(`Received response from GetItemsQuery: ${response}`))
    .catch(error => console.error(`Error: ${error.message}`));


// Define a simple request handler
class MyRequest {
    constructor(public data: string) {}
}

class MyResponse {
    constructor(public result: string) {}
}

class MyHandler {
    handle(request: MyRequest): MyResponse {
        console.log(`Handling request: ${request.data}`);
        return new MyResponse(`Handled: ${request.data}`);
    }
}

// Define a pipeline behavior
interface IPipelineBehavior<TRequest, TResponse> {
    handle(request: TRequest, next: () => Promise<TResponse>): Promise<TResponse>;
}

// Implement a sample pipeline behavior
class LoggingBehavior implements IPipelineBehavior<MyRequest, MyResponse> {
    async handle(request: MyRequest, next: () => Promise<MyResponse>): Promise<MyResponse> {
        console.log(`Before handling: ${request.data}`);
        const result = await next();
        console.log(`After handling: ${request.data}`);
        return result;
    }
}

// Mediator class to coordinate handlers and behaviors
class Mediator {
    private behaviors: IPipelineBehavior<MyRequest, MyResponse>[] = [];

    addBehavior(behavior: IPipelineBehavior<MyRequest, MyResponse>) {
        this.behaviors.push(behavior);
    }

    async send(request: MyRequest): Promise<MyResponse> {
        const handler = new MyHandler();

        const pipeline = this.behaviors.filter().reduceRight(
            (next, behavior) => async () => await behavior.handle(request, next),
            async () => await handler.handle(request)
        );

        return await pipeline();
    }
}

// Usage
const mediator = new Mediator();
mediator.addBehavior(new LoggingBehavior());

const request = new MyRequest('Sample data');
mediator.send(request)
    .then(response => console.log(`Received response: ${response.result}`))
    .catch(error => console.error(`Error: ${error.message}`));
