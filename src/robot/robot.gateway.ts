import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class RobotGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private logger: Logger = new Logger('RobotGateway');

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    /**
     * Envía una actualización de estado de un robot específico a todos los clientes.
     */
    broadcastStatusUpdate(serialNumber: string, data: any) {
        this.server.emit(`robotStatusUpdate`, { serialNumber, ...data });
    }

    /**
     * Envía una actualización de tarea (creada, completada, etc.)
     */
    broadcastTaskUpdate(serialNumber: string, data: any) {
        this.server.emit(`robotTaskUpdate`, { serialNumber, ...data });
    }
}
